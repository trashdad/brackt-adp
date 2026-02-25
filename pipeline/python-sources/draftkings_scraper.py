"""
DraftKings futures scraper.
Intercepts internal XHR/API JSON responses from DraftKings sportsbook pages
to extract structured futures odds without parsing HTML.
"""

import json
import logging
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from base_scraper import BaseScraper
from utils.normalizer import parse_american_odds

logger = logging.getLogger('brackt.draftkings')

DK_BASE_URL = 'https://sportsbook.draftkings.com'


class DraftKingsScraper(BaseScraper):
    def __init__(self):
        super().__init__('draftkings', delay_range=(3000, 8000))

    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """
        Navigate to DraftKings futures page and extract odds.
        Uses two strategies:
          1. Intercept XHR JSON from DK's internal API (preferred)
          2. Fall back to DOM scraping if XHR interception fails
        """
        futures_path = sport_mapping.get('futuresPath', '')
        if not futures_path:
            logger.warning(f'No futuresPath configured for {sport_id}')
            return []

        url = f'{DK_BASE_URL}{futures_path}'

        # Enable network interception for XHR capture
        self.driver.execute_cdp_cmd('Network.enable', {})

        self.navigate(url, wait_seconds=6)

        # Try DOM scraping approach (more reliable across page changes)
        entries = self._scrape_from_dom(sport_id)

        if not entries:
            logger.info(f'DOM scraping found no entries for {sport_id}, page may not have futures')

        return entries

    def _scrape_from_dom(self, sport_id: str) -> list[dict]:
        """Parse futures odds from the DraftKings page DOM."""
        entries = []

        try:
            # Wait for odds content to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[class*="sportsbook-outcome"]'))
            )
        except Exception:
            # Try alternative selectors
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[class*="outcome"], [class*="Outcome"]'))
                )
            except Exception:
                logger.warning(f'No outcome elements found for {sport_id}')
                return []

        # DraftKings uses various DOM structures; try multiple selectors
        selectors = [
            # Futures market table rows
            ('table tbody tr', self._parse_table_row),
            # Card-style layout
            ('[class*="sportsbook-outcome-cell"]', self._parse_outcome_cell),
            # List-style outcomes
            ('[class*="outcomes-list"] [class*="outcome"]', self._parse_outcome_cell),
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

            return self.make_entry(name, odds, 'DraftKings')
        except Exception:
            return None

    def _parse_outcome_cell(self, cell) -> dict | None:
        """Parse an outcome cell/card for name + odds."""
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

            return self.make_entry(name, odds, 'DraftKings')
        except Exception:
            return None


if __name__ == '__main__':
    import sys
    import json as json_mod

    logging.basicConfig(level=logging.INFO)

    sport_mappings_path = sys.argv[1] if len(sys.argv) > 1 else None
    if sport_mappings_path:
        with open(sport_mappings_path) as f:
            mappings = json.load(f)
    else:
        # Default: test with NFL
        mappings = {
            'nfl': {'futuresPath': '/sportsbook/nfl/futures'},
        }

    scraper = DraftKingsScraper()
    results = scraper.scrape_all(mappings)
    print(json_mod.dumps(results, indent=2))
