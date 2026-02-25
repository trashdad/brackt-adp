"""
OddsPortal historical odds scraper.
Scrapes historical futures/outrights odds using Selenium + BeautifulSoup.
"""

import json
import logging
import time

from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from base_scraper import BaseScraper
from utils.normalizer import parse_american_odds, normalize_name

logger = logging.getLogger('brackt.oddsportal')

OP_BASE_URL = 'https://www.oddsportal.com'


class OddsPortalScraper(BaseScraper):
    def __init__(self):
        super().__init__('oddsportal', delay_range=(3000, 7000))

    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """Scrape historical odds from OddsPortal."""
        path = sport_mapping.get('path', '')
        if not path:
            logger.warning(f'No path configured for {sport_id}')
            return []

        url = f'{OP_BASE_URL}{path}'
        self.navigate(url, wait_seconds=6)

        entries = []

        try:
            # Wait for content to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'table, [class*="event"], main'))
            )
        except Exception:
            logger.warning(f'Page did not load expected content for {sport_id}')
            return []

        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(self.driver.page_source, 'lxml')

        # Try parsing outright/futures tables
        entries = self._parse_outrights_table(soup)

        if not entries:
            # Try alternative layout
            entries = self._parse_event_list(soup)

        return entries

    def _parse_outrights_table(self, soup: BeautifulSoup) -> list[dict]:
        """Parse odds from OddsPortal's outrights table format."""
        entries = []

        # OddsPortal uses tables with class containing 'table' or data tables
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue

                # First cell: name, last cell: odds
                name_cell = cells[0]
                odds_cell = cells[-1]

                name = name_cell.get_text(strip=True)
                odds_text = odds_cell.get_text(strip=True)

                if not name or not odds_text:
                    continue

                # Skip header rows
                if any(skip in name.lower() for skip in ['participant', 'team', 'player', 'odds']):
                    continue

                odds = parse_american_odds(odds_text)
                if not odds:
                    continue

                entries.append(self.make_entry(name, odds, 'OddsPortal'))

        return entries

    def _parse_event_list(self, soup: BeautifulSoup) -> list[dict]:
        """Parse odds from OddsPortal's event list format."""
        entries = []

        # Look for event containers
        event_els = soup.select('[class*="event"], [class*="match"], [class*="participant"]')
        for el in event_els:
            text = el.get_text('\n', strip=True)
            lines = [l.strip() for l in text.split('\n') if l.strip()]

            if len(lines) < 2:
                continue

            name = lines[0]
            odds_text = lines[-1]

            odds = parse_american_odds(odds_text)
            if not odds:
                continue

            entries.append(self.make_entry(name, odds, 'OddsPortal'))

        return entries


if __name__ == '__main__':
    import sys

    logging.basicConfig(level=logging.INFO)

    sport_mappings_path = sys.argv[1] if len(sys.argv) > 1 else None
    if sport_mappings_path:
        with open(sport_mappings_path) as f:
            mappings = json.load(f)
    else:
        mappings = {
            'nfl': {'path': '/american-football/usa/nfl/'},
        }

    scraper = OddsPortalScraper()
    results = scraper.scrape_all(mappings, data_type='historical')
    print(json.dumps(results, indent=2))
