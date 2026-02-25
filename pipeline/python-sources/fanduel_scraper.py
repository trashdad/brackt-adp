"""
FanDuel futures scraper.
Similar approach to DraftKings — intercept XHR JSON or fall back to DOM parsing.
"""

import json
import logging
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from base_scraper import BaseScraper
from utils.normalizer import parse_american_odds

logger = logging.getLogger('brackt.fanduel')

FD_BASE_URL = 'https://sportsbook.fanduel.com'


class FanDuelScraper(BaseScraper):
    def __init__(self):
        super().__init__('fanduel', delay_range=(4000, 10000))

    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """Navigate to FanDuel futures page and extract odds."""
        futures_path = sport_mapping.get('futuresPath', '')
        if not futures_path:
            logger.warning(f'No futuresPath configured for {sport_id}')
            return []

        url = f'{FD_BASE_URL}{futures_path}'
        self.navigate(url, wait_seconds=7)

        entries = self._scrape_from_dom(sport_id)

        if not entries:
            logger.info(f'DOM scraping found no entries for {sport_id}')

        return entries

    def _scrape_from_dom(self, sport_id: str) -> list[dict]:
        """Parse futures odds from the FanDuel page DOM."""
        entries = []

        try:
            # Wait for market content to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((
                    By.CSS_SELECTOR,
                    '[class*="outcome"], [class*="selection"], [role="listitem"]'
                ))
            )
        except Exception:
            logger.warning(f'No outcome elements found for {sport_id}')
            return []

        # FanDuel selector strategies
        selectors = [
            # List-style outcomes with runner name + odds
            ('[class*="event-cell"], [class*="outcome-cell"]', self._parse_outcome_cell),
            # Table rows
            ('table tbody tr', self._parse_table_row),
            # Generic list items with odds
            ('[role="listitem"]', self._parse_listitem),
        ]

        for selector, parser in selectors:
            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
            if elements:
                for el in elements:
                    entry = parser(el)
                    if entry:
                        entries.append(entry)
                if entries:
                    break

        return entries

    def _parse_outcome_cell(self, cell) -> dict | None:
        """Parse an outcome cell for name + odds."""
        try:
            text = cell.text.strip()
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

            return self.make_entry(name, odds, 'FanDuel')
        except Exception:
            return None

    def _parse_table_row(self, row) -> dict | None:
        """Parse a table row for name + odds."""
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

            return self.make_entry(name, odds, 'FanDuel')
        except Exception:
            return None

    def _parse_listitem(self, item) -> dict | None:
        """Parse a list item for name + odds."""
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

            return self.make_entry(name, odds, 'FanDuel')
        except Exception:
            return None


if __name__ == '__main__':
    import sys

    logging.basicConfig(level=logging.INFO)

    sport_mappings_path = sys.argv[1] if len(sys.argv) > 1 else None
    if sport_mappings_path:
        with open(sport_mappings_path) as f:
            mappings = json.load(f)
    else:
        mappings = {
            'nfl': {'futuresPath': '/navigation/nfl/futures'},
        }

    scraper = FanDuelScraper()
    results = scraper.scrape_all(mappings)
    print(json.dumps(results, indent=2))
