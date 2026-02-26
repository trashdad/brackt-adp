"""
Abstract base class for all Python-based scrapers.
Handles browser lifecycle, rate limiting, retry logic, and raw JSON output.
"""

import abc
import json
import logging
import os
import sys
import time
from pathlib import Path

from utils.anti_bot import random_user_agent, random_delay
from utils.browser import create_browser
from utils.normalizer import normalize_name

logger = logging.getLogger('brackt.scraper')

RAW_DIR = Path(__file__).parent.parent / 'output' / '.raw'


class BaseScraper(abc.ABC):
    """Base class for all browser-based scrapers."""

    def __init__(self, source_id: str, delay_range: tuple[int, int] = (3000, 8000)):
        self.source_id = source_id
        self.delay_range = delay_range
        self.driver = None
        self.driver_type = None

    def start_browser(self, headless: bool = True):
        """Initialize the browser."""
        ua = random_user_agent()
        self.driver, self.driver_type = create_browser(headless=headless, user_agent=ua)
        return self.driver

    def stop_browser(self):
        """Shut down the browser."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    def polite_delay(self):
        """Wait a polite random delay between requests."""
        random_delay(self.delay_range[0], self.delay_range[1])

    def navigate(self, url: str, wait_seconds: int = 5, retries: int = 3):
        """Navigate to a URL with retry logic and basic verification."""
        for attempt in range(retries):
            try:
                logger.info(f'Navigating to {url} (Attempt {attempt+1}/{retries})')
                self.driver.get(url)
                time.sleep(wait_seconds)
                
                # Check for common "Access Denied" or Cloudflare patterns
                page_source = self.driver.page_source.lower()
                if "access denied" in page_source or "checking your browser" in page_source:
                    logger.warning(f"Detection triggered on {url}. Retrying...")
                    self.polite_delay()
                    continue
                
                return True
            except Exception as e:
                logger.error(f"Error navigating to {url}: {e}")
                if attempt == retries - 1:
                    self.save_screenshot(f"fail_nav_{self.source_id}")
                time.sleep(wait_seconds)
        return False

    def save_screenshot(self, label: str):
        """Save a debug screenshot of the current page."""
        log_dir = RAW_DIR.parent / 'logs' / 'screenshots'
        log_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{label}_{int(time.time())}.png"
        path = log_dir / filename
        try:
            self.driver.save_screenshot(str(path))
            logger.info(f"Screenshot saved to {path}")
        except Exception as e:
            logger.error(f"Failed to save screenshot: {e}")

    def scroll_to_bottom(self, increments: int = 3, delay: float = 1.0):
        """Scroll down the page to trigger lazy loading."""
        for i in range(increments):
            self.driver.execute_script("window.scrollBy(0, window.innerHeight);")
            time.sleep(delay)

    @abc.abstractmethod
    def scrape_sport(self, sport_id: str, sport_mapping: dict) -> list[dict]:
        """
        Scrape odds for a single sport.
        Must return a list of dicts with keys:
          { name, nameNormalized, odds, bookmaker, market }
        """
        ...

    def write_raw_output(self, sport_id: str, entries: list[dict], data_type: str = 'live'):
        """Write raw output JSON for a sport."""
        output_dir = RAW_DIR / self.source_id
        output_dir.mkdir(parents=True, exist_ok=True)

        data = {
            'source': self.source_id,
            'sport': sport_id,
            'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'type': data_type,
            'entries': entries,
        }

        output_path = output_dir / f'{sport_id}.json'
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f'[{self.source_id}] Wrote {len(entries)} entries for {sport_id}')
        return str(output_path)

    def scrape_all(self, sports_mapping: dict, data_type: str = 'live') -> dict[str, int]:
        """
        Scrape all configured sports. Returns a dict of sport_id -> entry count.
        Manages browser lifecycle automatically.
        """
        results = {}
        try:
            self.start_browser()

            for sport_id, mapping in sports_mapping.items():
                try:
                    entries = self.scrape_sport(sport_id, mapping)
                    if entries:
                        self.write_raw_output(sport_id, entries, data_type)
                        results[sport_id] = len(entries)
                    self.polite_delay()
                except Exception as e:
                    logger.error(f'[{self.source_id}] Failed to scrape {sport_id}: {e}')

        finally:
            self.stop_browser()

        return results

    @staticmethod
    def make_entry(name: str, odds: str, bookmaker: str, market: str = 'outrights') -> dict:
        """Create a standardized entry dict."""
        return {
            'name': name,
            'nameNormalized': normalize_name(name),
            'odds': odds,
            'bookmaker': bookmaker,
            'market': market,
        }
