import re


def normalize_name(name: str) -> str:
    """Normalize a name to lowercase alphanumeric for cross-source matching."""
    return re.sub(r'[^a-z0-9]', '', name.lower())


def american_to_implied_probability(odds: int | float) -> float:
    """Convert American odds to implied probability (0-1)."""
    odds = float(odds)
    if odds < 0:
        return abs(odds) / (abs(odds) + 100)
    return 100 / (odds + 100)


def format_american_odds(odds: int | float) -> str:
    """Format odds with +/- prefix."""
    odds = int(float(odds))
    return f"+{odds}" if odds > 0 else str(odds)


def parse_american_odds(text: str) -> str | None:
    """
    Extract American odds from text like '+150', '-200', '150', '+1,200', 'EVEN'.
    Returns formatted string like '+150' or '-200', or None if unparseable.
    """
    text = text.strip()

    if text.upper() == 'EVEN' or text.upper() == 'EV':
        return '+100'

    # Strip commas from formatted numbers like "+1,200" → "+1200"
    text = text.replace(',', '')

    match = re.search(r'([+-]?\d+)', text)
    if not match:
        return None

    value = int(match.group(1))
    if abs(value) < 100 and value != 0:
        return None
    if value == 0:
        return None

    return format_american_odds(value)
