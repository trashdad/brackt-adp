"""
Covers.com scraper for live + historical odds.
Covers provides consensus odds from multiple sportsbooks.
"""

import logging
import re
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from base_scraper import BaseScraper
from utils.normalizer import parse_american_odds

logger = logging.getLogger('brackt.covers')

COVERS_BASE_URL = 'https://www.covers.com'


class CoversScraper(BaseScraper):
    def __init__(self):
        super().__init__('covers', delay_range=(2000, 5000))

    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """Scrape futures odds from Covers.com."""
        path = sport_mapping.get('path', '')
        if not path:
            logger.warning(f'No path configured for {sport_id}')
            return []

        url = f'{COVERS_BASE_URL}{path}'
        self.navigate(url, wait_seconds=5)

        entries = []

        try:
            # Wait for odds table to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'table, [class*="odds"], [class*="futures"]'))
            )
        except Exception:
            logger.warning(f'No odds content found for {sport_id}')
            return []

        # Try table-based layout
        tables = self.driver.find_elements(By.CSS_SELECTOR, 'table')
        for table in tables:
            rows = table.find_elements(By.CSS_SELECTOR, 'tbody tr')
            for row in rows:
                entry = self._parse_covers_row(row)
                if entry:
                    entries.append(entry)

        # Try card/list layout if no table results
        if not entries:
            items = self.driver.find_elements(
                By.CSS_SELECTOR, '[class*="futures-item"], [class*="odds-row"], [class*="team-row"]'
            )
            for item in items:
                entry = self._parse_covers_item(item)
                if entry:
                    entries.append(entry)

        return entries

    def _parse_covers_row(self, row) -> dict | None:
        """Parse a table row from Covers futures page."""
        try:
            cells = row.find_elements(By.TAG_NAME, 'td')
            if len(cells) < 2:
                return None

            # First cell: team/player name (may contain link)
            name_el = cells[0].find_elements(By.TAG_NAME, 'a')
            name = name_el[0].text.strip() if name_el else cells[0].text.strip()

            # Last cell typically has the odds
            odds_text = cells[-1].text.strip()

            if not name or not odds_text:
                return None

            # Skip header-like rows
            if any(skip in name.lower() for skip in ['team', 'player', 'name', 'odds']):
                return None

            # Skip rows where the "name" looks like odds (e.g., "+1,200")
            name_stripped = name.replace(',', '').replace(' ', '')
            if re.match(r'^[+-]?\d+$', name_stripped):
                return None

            odds = parse_american_odds(odds_text)
            if not odds:
                return None

            return self.make_entry(name, odds, 'Covers')
        except Exception:
            return None

    def _parse_covers_item(self, item) -> dict | None:
        """Parse a card/list item from Covers."""
        try:
            text = item.text.strip()
            if not text:
                return None

            lines = [l.strip() for l in text.split('\n') if l.strip()]
            if len(lines) < 2:
                return None

            name = lines[0]
            odds_text = lines[-1]

            odds = parse_american_odds(odds_text)
            if not odds:
                return None

            return self.make_entry(name, odds, 'Covers')
        except Exception:
            return None


if __name__ == '__main__':
    import sys
    import json

    logging.basicConfig(level=logging.INFO)

    sport_mappings_path = sys.argv[1] if len(sys.argv) > 1 else None
    if sport_mappings_path:
        with open(sport_mappings_path) as f:
            mappings = json.load(f)
    else:
        mappings = {
            'nfl': {'path': '/sport/football/nfl/odds/futures'},
        }

    scraper = CoversScraper()
    results = scraper.scrape_all(mappings)
    print(json.dumps(results, indent=2))
