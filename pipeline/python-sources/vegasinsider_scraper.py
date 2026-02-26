"""
VegasInsider futures odds scraper.
Very reliable source with clean table layouts for major sports.
"""

import logging
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from base_scraper import BaseScraper
from utils.normalizer import parse_american_odds

logger = logging.getLogger('brackt.vegasinsider')

VI_BASE_URL = 'https://www.vegasinsider.com'

class VegasInsiderScraper(BaseScraper):
    def __init__(self):
        super().__init__('vegasinsider', delay_range=(2000, 5000))

    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """Scrape futures odds from VegasInsider."""
        path = sport_mapping.get('path', '')
        if not path:
            # Default paths if not specified in mapping
            paths = {
                'nfl': '/nfl/odds/futures/',
                'nba': '/nba/odds/futures/',
                'mlb': '/mlb/odds/futures/',
                'nhl': '/nhl/odds/futures/',
                'ncaaf': '/college-football/odds/futures/',
                'ncaab': '/college-basketball/odds/futures/',
            }
            path = paths.get(sport_id, '')
        
        if not path:
            logger.warning(f'No path configured for {sport_id}')
            return []

        url = f'{VI_BASE_URL}{path}'
        if not self.navigate(url, wait_seconds=5):
            return []

        # Sometimes they have an overlay
        try:
            close_btn = self.driver.find_elements(By.CSS_SELECTOR, '.close, [class*="close-button"]')
            if close_btn:
                close_btn[0].click()
        except:
            pass

        self.scroll_to_bottom(increments=2)
        
        soup = BeautifulSoup(self.driver.page_source, 'lxml')
        entries = []

        # VegasInsider often uses tables with class 'vi-futures-table' or standard <table>
        tables = soup.select('table.vi-futures-table, table.futures-table, table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue
                
                name = cells[0].get_text(strip=True)
                # Usually odds are in the second cell or a specific cell
                # We'll check the last cell first as it's common
                odds_text = cells[-1].get_text(strip=True)
                
                # Skip if name is a header
                if name.lower() in ['team', 'player', 'participant', 'name'] or not name:
                    continue
                
                odds = parse_american_odds(odds_text)
                if not odds:
                    # Try other cells if last one failed
                    for cell in cells[1:]:
                        odds = parse_american_odds(cell.get_text(strip=True))
                        if odds:
                            break
                
                if name and odds:
                    entries.append(self.make_entry(name, odds, 'VegasInsider'))

        logger.info(f"[{self.source_id}] Found {len(entries)} entries for {sport_id}")
        return entries

if __name__ == '__main__':
    import sys
    import json
    logging.basicConfig(level=logging.INFO)
    
    scraper = VegasInsiderScraper()
    mappings = {'nfl': {'path': '/nfl/odds/futures/'}}
    results = scraper.scrape_all(mappings)
    print(json.dumps(results, indent=2))
