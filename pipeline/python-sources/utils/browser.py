"""
Browser factory for Selenium-based scrapers.
Tries undetected-chromedriver first (best anti-bot), falls back to standard Selenium.
"""

import logging

logger = logging.getLogger('brackt.browser')


def create_browser(headless: bool = True, user_agent: str | None = None):
    """
    Create a browser instance. Tries undetected-chromedriver first,
    then falls back to standard Selenium ChromeDriver.

    Returns a (driver, driver_type) tuple.
    """
    # Try undetected-chromedriver first
    try:
        import undetected_chromedriver as uc

        options = uc.ChromeOptions()
        if headless:
            options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        if user_agent:
            options.add_argument(f'--user-agent={user_agent}')

        driver = uc.Chrome(options=options)
        logger.info('Using undetected-chromedriver')
        return driver, 'undetected'

    except ImportError:
        logger.info('undetected-chromedriver not available, trying standard Selenium')
    except Exception as e:
        logger.warning(f'undetected-chromedriver failed: {e}, trying standard Selenium')

    # Fallback to standard Selenium
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service

    options = Options()
    if headless:
        options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    if user_agent:
        options.add_argument(f'--user-agent={user_agent}')

    driver = webdriver.Chrome(options=options)
    logger.info('Using standard Selenium ChromeDriver')
    return driver, 'standard'
