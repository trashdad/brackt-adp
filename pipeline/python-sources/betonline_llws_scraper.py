"""
BetOnline LLWS seasonal scraper.
Only active during July-September when LLWS futures are available.
"""

import json
import logging
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from base_scraper import BaseScraper
from utils.normalizer import parse_american_odds

logger = logging.getLogger('brackt.betonline_llws')

BETONLINE_BASE_URL = 'https://www.betonline.ag'


class BetOnlineLLWSScraper(BaseScraper):
    def __init__(self):
        super().__init__('betonline-llws', delay_range=(3000, 8000))

    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """Scrape LLWS futures from BetOnline."""
        if sport_id != 'llws':
            return []

        path = sport_mapping.get('path', '/futures/little-league-world-series')
        url = f'{BETONLINE_BASE_URL}{path}'

        self.navigate(url, wait_seconds=7)

        entries = []

        try:
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((
                    By.CSS_SELECTOR,
                    'table, [class*="odds"], [class*="futures"], [class*="market"]'
                ))
            )
        except Exception:
            logger.warning('No LLWS futures content found — may be off-season')
            return []

        # Try table-based layout
        tables = self.driver.find_elements(By.CSS_SELECTOR, 'table')
        for table in tables:
            rows = table.find_elements(By.CSS_SELECTOR, 'tbody tr')
            for row in rows:
                entry = self._parse_row(row)
                if entry:
                    entries.append(entry)

        # Try list/card layout
        if not entries:
            items = self.driver.find_elements(
                By.CSS_SELECTOR,
                '[class*="futures"], [class*="market-item"], [class*="selection"]'
            )
            for item in items:
                entry = self._parse_item(item)
                if entry:
                    entries.append(entry)

        return entries

    def _parse_row(self, row) -> dict | None:
        """Parse a table row."""
        try:
            cells = row.find_elements(By.TAG_NAME, 'td')
            if len(cells) < 2:
                return None

            name = cells[0].text.strip()
            odds_text = cells[-1].text.strip()

            if not name or not odds_text:
                return None

            odds = parse_american_odds(odds_text)
            if not odds:
                return None

            return self.make_entry(name, odds, 'BetOnline')
        except Exception:
            return None

    def _parse_item(self, item) -> dict | None:
        """Parse a card/list item."""
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

            return self.make_entry(name, odds, 'BetOnline')
        except Exception:
            return None


if __name__ == '__main__':
    import sys

    logging.basicConfig(level=logging.INFO)

    mappings = {
        'llws': {'path': '/futures/little-league-world-series'},
    }

    scraper = BetOnlineLLWSScraper()
    results = scraper.scrape_all(mappings)
    print(json.dumps(results, indent=2))
