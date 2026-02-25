import json
import os
import random
import time

_UA_POOL = None


def _load_user_agents() -> list[str]:
    """Load user-agent pool from config file."""
    global _UA_POOL
    if _UA_POOL is None:
        config_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 'config', 'user-agents.json'
        )
        with open(config_path, 'r') as f:
            _UA_POOL = json.load(f)
    return _UA_POOL


def random_user_agent() -> str:
    """Return a random user agent from the pool."""
    agents = _load_user_agents()
    return random.choice(agents)


def random_delay(min_ms: int = 2000, max_ms: int = 5000) -> None:
    """Sleep for a random duration between min_ms and max_ms milliseconds."""
    delay = random.uniform(min_ms / 1000, max_ms / 1000)
    time.sleep(delay)


def jitter_delay(base_ms: int = 3000, jitter_ms: int = 2000) -> None:
    """Sleep for base_ms +/- random jitter."""
    delay = (base_ms + random.uniform(-jitter_ms, jitter_ms)) / 1000
    time.sleep(max(0.5, delay))
