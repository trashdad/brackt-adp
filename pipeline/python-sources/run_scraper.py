"""
CLI entry point for running Python scrapers.

Usage:
  python run_scraper.py --source draftkings --sport nfl
  python run_scraper.py --source draftkings --all
  python run_scraper.py --source oddsportal --all --type historical
"""

import argparse
import json
import logging
import os
import sys

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(__file__))

SCRAPER_MAP = {
    'draftkings': ('draftkings_scraper', 'DraftKingsScraper'),
    'fanduel': ('fanduel_scraper', 'FanDuelScraper'),
    'oddsportal': ('oddsportal_scraper', 'OddsPortalScraper'),
    'covers': ('covers_scraper', 'CoversScraper'),
    'betonline-llws': ('betonline_llws_scraper', 'BetOnlineLLWSScraper'),
}

SPORTS_MAPPING_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'config', 'sports-mapping.json'
)


def load_sports_mapping():
    with open(SPORTS_MAPPING_PATH) as f:
        return json.load(f)


def get_source_mappings(source_id: str, sport_ids: list[str] | None = None) -> dict:
    """Get sport mappings filtered for a specific source."""
    all_mappings = load_sports_mapping()
    result = {}
    for sport_id, sources in all_mappings.items():
        if sport_ids and sport_id not in sport_ids:
            continue
        if source_id in sources:
            result[sport_id] = sources[source_id]
    return result


def main():
    parser = argparse.ArgumentParser(description='Run a Brackt ADP scraper')
    parser.add_argument('--source', required=True, choices=list(SCRAPER_MAP.keys()),
                        help='Which scraper to run')
    parser.add_argument('--sport', type=str, default=None,
                        help='Specific sport ID to scrape (e.g., nfl)')
    parser.add_argument('--all', action='store_true',
                        help='Scrape all configured sports for this source')
    parser.add_argument('--type', type=str, default='live',
                        choices=['live', 'historical'],
                        help='Data type (live or historical)')
    parser.add_argument('--headless', action='store_true', default=True,
                        help='Run browser in headless mode (default: true)')
    parser.add_argument('--visible', action='store_true',
                        help='Run browser in visible mode (for debugging)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Enable verbose logging')

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format='%(asctime)s %(name)s %(levelname)s: %(message)s',
    )

    # Import the appropriate scraper
    module_name, class_name = SCRAPER_MAP[args.source]
    module = __import__(module_name)
    ScraperClass = getattr(module, class_name)

    # Determine sport mappings
    sport_ids = None
    if args.sport:
        sport_ids = [args.sport]
    elif not args.all:
        parser.error('Must specify --sport or --all')

    mappings = get_source_mappings(args.source, sport_ids)
    if not mappings:
        print(f'No mappings found for source={args.source}, sports={sport_ids or "all"}')
        sys.exit(1)

    print(f'Running {args.source} scraper for {list(mappings.keys())}')

    scraper = ScraperClass()
    results = scraper.scrape_all(mappings, data_type=args.type)

    print(f'\nResults:')
    for sport_id, count in results.items():
        print(f'  {sport_id}: {count} entries')

    if not results:
        print('  (no entries found)')


if __name__ == '__main__':
    main()
