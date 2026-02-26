# BRACKT_ADP_16BIT 🕹️

A high-performance, 16-bit arcade-themed sports drafting utility. Aggregates futures odds, calculates EV through Monte Carlo simulations, and manages draft priority with positional scarcity logic.

## ARCHITECTURE_NODES

- **Frontend**: React 18 + Tailwind CSS (Vite)
- **Proxy Node**: Cloudflare Worker (Proxy for CORS bypass & Secret protection)
- **Scraper Node**: Python + Selenium (Local extraction of sportsbook data)
- **Backend Node**: Express.js (Live data merging & manifest generation)

## SYSTEM_BOOT_SEQUENCE

### 1. Frontend & Local Server
```bash
npm install
npm run dev:all
```

### 2. Proxy Node (Cloudflare)
```bash
# Run locally
npm run worker:dev

# Deploy to Cloudflare
npm run worker:deploy
```

### 3. Scraper Pipeline
```bash
cd pipeline
pip install -r requirements.txt
python python-sources/run_scraper.py --source draftkings --all
```

## TERMINAL_COMMANDS

- `npm run worker:dev`: Initialize local proxy node at `localhost:8787`
- `npm run worker:deploy`: Push proxy node to Cloudflare edge
- `npm run dev:all`: Launch frontend and local storage server

## CONFIGURATION

API keys can be managed via the **TERMINAL_CFG** page in the application. LED status indicators will notify you of successful authentication.
