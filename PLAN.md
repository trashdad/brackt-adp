# Brackt ADP - Implementation Plan

## Overview
A React + Tailwind CSS web application that aggregates sports betting futures odds across 20 sports, calculates Expected Value (EV) and Season-Total EV, and produces a unified Average Draft Position (ADP) board for a fantasy-style league draft.

---

## Architecture

### Tech Stack
- **React 18** with Vite (fast build tooling)
- **React Router v6** for routing
- **Tailwind CSS v3** for styling
- **The Odds API** as primary data source (free tier: 500 req/month)
- **localStorage** for draft tracking state persistence
- **Mock/seed data** for development + fallback when API is unavailable

### Project Structure
```
brackt-adp/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── board/
│   │   │   ├── ADPTable.jsx          # Main sortable ADP table
│   │   │   ├── ADPRow.jsx            # Individual row component
│   │   │   ├── ColumnHeader.jsx      # Sortable column header
│   │   │   └── DraftedBadge.jsx      # "Drafted" indicator
│   │   ├── filters/
│   │   │   ├── SportFilter.jsx       # Sport category filter
│   │   │   ├── SearchBar.jsx         # Search by team/player name
│   │   │   └── ScoringToggle.jsx     # Standard vs QP view
│   │   └── cards/
│   │       ├── PlayerCard.jsx        # Detail card for a player/team
│   │       └── EVBreakdown.jsx       # EV calculation breakdown
│   ├── pages/
│   │   ├── Dashboard.jsx             # Combined ADP board (home)
│   │   ├── SportView.jsx             # Single sport filtered view
│   │   ├── PlayerDetail.jsx          # Individual player/team detail
│   │   └── Settings.jsx              # API key config, preferences
│   ├── data/
│   │   ├── sports.js                 # Sport definitions & configs
│   │   ├── scoring.js                # Scoring tables (standard + QP)
│   │   └── mockData.js               # Seed data for development
│   ├── services/
│   │   ├── oddsApi.js                # The Odds API integration
│   │   ├── oddsConverter.js          # American odds → probability
│   │   └── evCalculator.js           # EV + Season-Total EV engine
│   ├── hooks/
│   │   ├── useOddsData.js            # Fetch + cache odds data
│   │   ├── useDraftBoard.js          # Draft state management
│   │   └── useSorting.js             # Sorting logic
│   ├── utils/
│   │   ├── formatters.js             # Number/odds formatting
│   │   └── storage.js                # localStorage helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                     # Tailwind imports
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Data Model

### Sport Configuration
```js
{
  id: 'nfl',
  name: 'NFL',
  apiKey: 'americanfootball_nfl',        // The Odds API sport key
  category: 'standard',                   // 'standard' | 'qp'
  eventsPerSeason: 1,                     // 1 for championships, ~30 for golf
  market: 'outrights',                    // futures market type
  icon: '🏈',
  active: true
}
```

### Player/Team Entry
```js
{
  id: 'nfl-kansas-city-chiefs',
  name: 'Kansas City Chiefs',
  sport: 'nfl',
  sportName: 'NFL',
  scoringType: 'standard',
  odds: {
    american: '+350',
    decimal: 4.5,
    impliedProbability: 0.222     // 22.2% to win
  },
  ev: {
    singleEvent: 22.2,            // probability × 100pts
    seasonTotal: 22.2,            // same for 1-event sports
    perFinish: {                   // EV broken down by finish
      first: 22.2,
      second: 5.6,
      third: 2.1,
      ...
    }
  },
  adpRank: 1,                     // overall rank by season-total EV
  drafted: false,
  draftedBy: null
}
```

---

## Scoring Systems

### Standard Scoring (16 sports)
| Finish | Points |
|--------|--------|
| 1st    | 100    |
| 2nd    | 70     |
| 3rd    | 50     |
| 4th    | 40     |
| 5th–6th | 25   |
| 7th–8th | 15   |

### QP Scoring (Golf, Tennis Men's, Tennis Women's, Counter-Strike)
| Finish | QP  |
|--------|-----|
| 1st    | 20  |
| 2nd    | 14  |
| 3rd    | 10  |
| 4th    | 8   |
| 5th–6th | 5  |
| 7th–8th | 3  |
| 9th–12th | 2 |
| 13th–16th | 1 |

---

## EV Calculation Engine

### Step 1: American Odds → Implied Probability
```
Negative odds: probability = |odds| / (|odds| + 100)
Positive odds: probability = 100 / (odds + 100)
```

### Step 2: Single-Event EV
For each team/player, calculate EV across all possible finishes:
```
EV = P(1st) × Points(1st) + P(2nd) × Points(2nd) + ... + P(8th) × Points(8th)
```

**Key issue**: Futures odds typically only give win probability (1st place). For lower finishes, we'll use a probability decay model:
- P(1st) = from odds
- P(2nd) ≈ P(1st) × 1.2 (slightly more likely to finish 2nd than 1st)
- P(3rd) ≈ P(1st) × 1.1
- P(4th) ≈ P(1st) × 1.0
- P(5th-8th): distributed based on remaining probability

This is a simplification — the simulation engine (future work) will refine this.

### Step 3: Season-Total EV (for ADP normalization)
```
Season-Total EV = Single-Event EV × eventsPerSeason
```
- NFL: 1 event (Super Bowl) → EV × 1
- PGA Golf: ~30 events → EV × 30
- Tennis: ~4 Grand Slams + 9 Masters = ~13 events → EV × 13
- Counter-Strike BLAST: ~6 major events → EV × 6

This normalizes across sports so a golfer's cumulative season value is comparable to an NFL team's championship shot.

---

## API Integration

### The Odds API (Primary)
- **Endpoint**: `GET /v4/sports/{sport}/odds`
- **Params**: `apiKey`, `regions=us`, `markets=outrights`, `oddsFormat=american`
- **Sports covered**: NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball (M/W), WNBA, AFL, F1, UEFA CL, PGA, Tennis, FIFA World Cup, Darts
- **Caching**: Cache responses in localStorage with 24hr TTL to conserve the 500 req/month limit

### Niche Sport Fallbacks
- **Little League World Series**: Manual entry form / web scraping
- **IndyCar**: Manual entry / scraping from public odds pages
- **Counter-Strike (BLAST)**: The Odds API has esports; also fallback to PandaScore
- **Snooker**: The Odds API or Goalserve fallback

### Request Budget Strategy (500/month)
- 20 sports × 1 request each = 20 requests per full refresh
- Budget allows ~25 full refreshes per month (roughly daily)
- Cache aggressively, show "last updated" timestamps

---

## UI/UX Design

### Dashboard (Home Page)
- Full-width responsive table showing ALL players/teams ranked by Season-Total EV
- Columns: Rank | Player/Team | Sport | Win % | Odds | Single EV | Season EV | ADP | Status
- Sticky header with sort controls on every column
- Color-coded sport badges (NFL = blue, NBA = orange, etc.)
- "Drafted" toggle to mark players as taken (grayed out but visible)
- Search bar + sport filter chips above table
- Responsive: table on desktop, cards on mobile

### Sport View (/sport/:id)
- Same table filtered to one sport
- Additional context: season dates, number of events (for QP sports)
- Mini leaderboard showing top 10 by EV

### Player Detail (/player/:id)
- Full EV breakdown with probability distribution chart
- Odds from multiple bookmakers (if available)
- Scoring potential visualization
- "Draft" button

### Settings (/settings)
- API key input
- Refresh interval preferences
- Manual data entry form for niche sports
- Export/import draft state

---

## Implementation Steps

### Phase 1: Project Scaffolding
1. Initialize Vite + React project
2. Install dependencies (react-router-dom, tailwindcss, etc.)
3. Configure Tailwind CSS
4. Set up React Router with all routes
5. Create Layout component (Header, Sidebar)

### Phase 2: Data Layer
6. Define sport configurations (all 20 sports)
7. Build scoring system module
8. Create comprehensive mock/seed data
9. Build odds converter utility
10. Build EV calculation engine

### Phase 3: API Integration
11. Build The Odds API service with caching
12. Create useOddsData hook
13. Wire up API responses to data model
14. Add fallback to mock data when API unavailable

### Phase 4: Core UI
15. Build ADPTable (sortable, filterable)
16. Build sport filter chips
17. Build search functionality
18. Build draft tracking (mark as drafted)
19. Build Dashboard page
20. Build Sport View page

### Phase 5: Detail & Polish
21. Build Player Detail page with EV breakdown
22. Build Settings page
23. Add responsive mobile layout (card view)
24. Add localStorage persistence for draft state
25. Final styling and polish

---

## Suggestions & Considerations

1. **Simulation Engine (Future)**: Leave a clean `services/simulator.js` interface where Monte Carlo simulations can plug in. The current probability decay model is a starting point.

2. **Rate Limiting**: Display a "requests remaining" counter so users know their API budget status.

3. **Color Coding**: Use consistent sport colors throughout (table rows, badges, charts) for quick visual scanning during a live draft.

4. **Keyboard Navigation**: Support arrow keys + Enter for fast drafting during a live draft session.

5. **Export**: Allow CSV export of the full ADP board for offline reference.
