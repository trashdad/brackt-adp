# BRACKT_ADP_16BIT 🕹️

A high-performance, 16-bit arcade-themed sports drafting utility. Aggregates futures odds, calculates EV through Monte Carlo simulations, and manages draft priority with positional scarcity logic.

## ARCHITECTURE_NODES

- **Frontend**: React 18 + Tailwind CSS (Vite)
- **Scraper Node**: Python + Selenium (Local extraction of sportsbook data)
- **Backend Node**: Express.js (Live data merging & manifest generation)

## DEPLOYMENT_MODES

### Netlify (Recommended)
This application is pre-configured for **Netlify** with persistent storage via **Netlify Blobs**.
1. Connect your GitHub repository to Netlify.
2. Build Command: `npm run build`
3. Publish Directory: `dist`
4. **Enable Blobs**: In your Netlify dashboard, ensure your site has access to Netlify Blobs (usually enabled by default for new sites).
5. Routing: Handled by `netlify.toml` which redirects `/api` to serverless functions.

*Note: With Netlify Blobs, your draft state and manual odds are shared and persistent across all users of your deployed site.*

## SYSTEM_BOOT_SEQUENCE

### 1. Frontend & Local Server
```bash
npm install
npm run dev:all
```

### 2. Scraper Pipeline
```bash
cd pipeline
pip install -r requirements.txt
python python-sources/run_scraper.py --source draftkings --all
```

## TERMINAL_COMMANDS

- `npm run dev:all`: Launch frontend and local storage server

## CONFIGURATION

API keys can be managed via the **TERMINAL_CFG** page in the application. LED status indicators will notify you of successful authentication.
