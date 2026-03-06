# Brackt ADP — EV Model v2: Beating Market Efficiency

## Mission
Build an Expected Value model for a 20-sport fantasy league draft that converts global betting odds into draft-optimal EV scores (0–100 per player, ~340 total per sport). The goal: identify which players/teams to draft over others by quantifying their expected fantasy point contribution more accurately than raw market odds imply.

## Reference Calibration
- **Alex Palou (IndyCar)** ≈ 84 EV (QP/tournament sport, dominant favorite)
- No player should exceed 84 EV or exceed Palou without extremely strong justification
- Max EV per player: 100 (theoretical ceiling = 1st place points)
- Total EV per sport: ~340 (natural soft constraint from scoring table sum)

## Scoring System (from brackt.com/rules)
| Finish | Standard Points | QP Points (per event) |
|--------|----------------|-----------------------|
| 1st    | 100            | 20                    |
| 2nd    | 70             | 14                    |
| 3rd    | 50             | 10                    |
| 4th    | 40             | 8                     |
| 5th-6th| 25             | 5                     |
| 7th-8th| 15             | 3                     |
| 9th-12th| —             | 2                     |
| 13th-16th| —            | 1                     |

**QP Sports**: PGA, Tennis (M/W), Counter-Strike — use tournament-level QP scoring aggregated across events.

**Standard Sports** (16): NFL, NBA, MLB, NHL, WNBA, AFL, F1, IndyCar, Darts, Snooker, UCL, FIFA, NCAA Football, NCAA Basketball (M/W), LLWS.

**Draft format**: Snake draft, locked rosters, must draft ≥1 from each sport.

---

## The Core Problem

We have **market-implied P(win)** from global sportsbook odds. This tells us probability of finishing 1st. But fantasy scoring rewards positions 1st through 8th. We need:

1. **P(finish at position k)** for k = 1 through 8 (and beyond for QP sports)
2. **EV = Σ P(k) × Points(k)** across all scoring tiers
3. **Modifiers** that adjust P(win) based on factors the market may not fully price in for *fantasy draft* purposes (not betting purposes)

The previous model tried to modify season EV directly. **This failed.** The new approach: modify the **win probability** first, then derive EV from the adjusted probability distribution.

---

## 8 Approaches to Tackle This Problem

### Approach 1: Shin-Corrected Devigging + Enhanced Plackett-Luce
**Theory**: The current model uses basic normalization to remove vig (divide each implied probability by the overround sum). This introduces **favorite-longshot bias** — favorites are undervalued, longshots are overvalued.

**Method**: Replace basic normalization with [Shin's method](https://github.com/mberk/shin) or the [Power method](https://help.outlier.bet/en/articles/8208129-how-to-devig-odds-comparing-the-methods), which are designed to correct for this exact bias. The Power method raises probabilities to a constant power that forces them to sum to 1 while preserving the favorite-longshot relationship more accurately.

**Impact**: This changes the *base probability* before it enters the Plackett-Luce rank distribution model. Favorites like Palou get a small but meaningful probability boost; deep longshots get slightly reduced. This alone could shift EV by 2-5 points for top contenders.

**References**:
- [Shin's method Python implementation](https://github.com/mberk/shin)
- [FairOdds Terminal devigging guide](https://fairoddsterminal.com/what-is-vig-devigging-guide)
- [Pinnacle Odds Dropper — 4 devig methods compared](https://www.pinnacleoddsdropper.com/guides/how-to-devig-pinnacle-s-odds-for-betting-on-soft-books)
- [Outlier — How to Devig Odds](https://help.outlier.bet/en/articles/8208129-how-to-devig-odds-comparing-the-methods)

**Verdict**: ✅ Implement. Low-risk, mathematically sound, well-documented. Should be the new baseline.

---

### Approach 2: Multi-Market Triangulation (Constraining the Rank Distribution)
**Theory**: Championship winner odds only tell us P(1st). But sportsbooks also offer "top 4 finish", "to make playoffs", "division winner", etc. These are *additional data points* that constrain the rank distribution.

**Method**: Where available, collect supplementary market odds:
- "To make Final Four" / "To make playoffs" → constrains P(top 4) or P(top 8)
- "Group stage exit" → constrains P(outside top 16)
- Head-to-head matchup odds → pairwise strength signals

Use these as **constraints** on the Plackett-Luce model. Instead of deriving P(2nd)–P(8th) purely from P(1st), anchor intermediate positions to real market data.

**Impact**: This is the single highest-value improvement. The current PL approximation is a "guess" at P(2nd)–P(8th) from P(1st). Multi-market data makes it a measurement.

**References**:
- [FiveThirtyEight methodology](https://fivethirtyeight.com/methodology/how-our-nfl-predictions-work/) — combines multiple signal types
- [Pinnacle — sharp bookmaker analysis](https://www.pinnacle.com/betting-resources/en/educational/what-is-closing-line-value-clv-in-sports-betting)

**Verdict**: ✅ Implement where data exists. High value for NFL/NBA/soccer (rich prop markets), lower for niche sports.

---

### Approach 3: Log-Odds Modifier Framework (The Probability Adjustment Engine)
**Theory**: Modifiers should operate in **log-odds (logit) space**, not probability space. This is what the old system did correctly. A modifier of +0.1 in logit space means "this team is ~2.5% more likely to win than market implies" regardless of their base probability. This avoids the mathematical problems of multiplying probabilities directly (bound violations, non-linearity at extremes).

**Method**:
```
logit(p) = ln(p / (1 - p))
adjusted_logit = logit(baseProbWinPct) + Σ modifier_i
adjustedProbWinPct = 1 / (1 + e^(-adjusted_logit))
```

**Hybrid modifier categories** (restored from old + new research-backed):

| Category | Type | Source | Sports |
|----------|------|--------|--------|
| Age/peak curve | Objective | Historical performance data | F1, Tennis, PGA, Darts, Snooker |
| Coaching/management change | Subjective | Preseason analysis | NFL, NBA, NHL, NCAA |
| Home advantage / surface | Objective | Historical win rates | Tennis, FIFA, UCL |
| Team continuity / roster turnover | Objective | Offseason transaction data | NFL, NBA, MLB, NHL |
| Form / momentum | Objective | Recent results | All individual sports |
| Technical/equipment alpha | Subjective | Constructor budgets, team resources | F1, IndyCar |
| Injury / availability | Objective | Injury reports | All sports |
| Schedule strength | Objective | Remaining schedule analysis | MLB, NBA, NHL |

**Key constraint**: Each modifier should be small (±0.05 to ±0.20 in logit space). The market is *mostly right*. We're looking for 2-8% edges, not wholesale re-ranking.

**References**:
- [A statistical theory of optimal decision-making in sports betting](https://pmc.ncbi.nlm.nih.gov/articles/PMC10306238/)
- The old `evCalculator.js` `adjustProbability()` function used this exact approach before removal

**Verdict**: ✅ Implement. This is the core adjustment engine. Keep modifiers conservative and well-sourced.

---

### Approach 4: Entropy-Weighted Confidence Scaling
**Theory**: Not all sports have equally efficient markets. NFL futures at Pinnacle are extremely sharp. Little League World Series odds on DraftKings are set by one analyst with a spreadsheet. We should trust the market *proportionally to its efficiency*.

**Method**: Calculate Shannon entropy of each sport's odds field:
```
H(sport) = -Σ p_i × log₂(p_i)
```
High entropy (wide-open field, many contenders) = less market certainty = modifiers have MORE room to add value.
Low entropy (dominant favorite) = market is confident = modifiers should be SMALLER.

Scale modifier magnitude by: `modifier_effective = modifier_raw × (1 - market_confidence)` where market_confidence is derived from entropy relative to maximum entropy for that field size.

Also factor in:
- **Number of sources**: More sportsbooks pricing it = sharper line
- **Liquidity proxy**: Major US sports > international > niche
- **Line movement**: Stable odds = consensus; volatile = uncertainty

**References**:
- [Gambling and information theory (Wikipedia)](https://en.wikipedia.org/wiki/Gambling_and_information_theory)
- [Information Theory, Sport, Betting and the Stock Market](http://www.lavarnd.org/information_theory.html)

**Verdict**: ✅ Implement. Elegant way to auto-calibrate modifier confidence per sport. Prevents over-adjusting sharp markets and under-adjusting thin ones.

---

### Approach 5: Value Over Replacement (VOR) for Draft Positioning
**Theory**: Raw EV isn't the whole draft story. A player with 60 EV in a sport where the next-best is 20 EV is far more valuable to draft than a player with 70 EV in a sport where everyone clusters at 50-65. This is the [Value-Based Drafting](https://fantasyfootballanalytics.net/2024/08/winning-fantasy-football-with-projections-value-over-replacement-and-value-based-drafting.html) concept from fantasy football.

**Method**:
```
VOR = playerEV - replacementLevelEV
replacementLevelEV = EV of the (N+1)th player, where N = expected # drafted from this sport
```

This already partially exists in the codebase (`SPORT_REPLACEMENT_LEVELS`, `applyPositionalScarcity`). Refine it by:
1. Dynamically calculating replacement level from actual odds data (not hardcoded)
2. Using **drop-off analysis** — flag players where EV drops sharply to the next player ([Subvertadown's scarcity analysis](https://subvertadown.com/article/fantasy-snake-drafts-and-strategizing-for-scarcity----snake-value-based-drafting))
3. Incorporating cross-sport opportunity cost (drafting Palou at 84 EV means *not* drafting an NFL team at 78 EV — which has more VOR?)

**References**:
- [FantasyPros — Value-Based Drafting (VORP, VOLS, VONA)](https://www.fantasypros.com/2025/06/fantasy-football-draft-strategy-value-based-drafting-vorp-vols-vona/)
- [Subvertadown — Snake Drafts and Strategizing for Scarcity](https://subvertadown.com/article/fantasy-snake-drafts-and-strategizing-for-scarcity----snake-value-based-drafting)
- [Harvard Sports Analysis — Game Theory and Fantasy Draft Strategy](http://www.advancedfootballanalytics.com/2008/08/game-theory-and-fantasy-draft-strategy.html)
- [FanGraphs — How to Win Your Snake Draft](https://fantasy.fangraphs.com/how-to-win-your-snake-draft/)

**Verdict**: ✅ Implement. Already partially exists. Refine to be data-driven rather than hardcoded.

---

### Approach 6: Monte Carlo Full-Season Simulation
**Theory**: Instead of analytically computing P(finish k), *simulate the season* thousands of times. For each simulation, draw results based on adjusted probabilities and see where each team actually finishes. This naturally handles correlations, upsets, and non-linear effects that analytical models miss.

**Method**: The current `ikynEV` system already does 300,000 PL-MC simulations. Enhance it by:
1. Using **adjusted win probabilities** (from Approach 3) as simulation inputs instead of raw market odds
2. For tournament sports (IndyCar, PGA, Tennis, CS2): simulate each event independently, accumulate QP, rank by season QP total
3. Add **correlation modeling** — e.g., in F1, if McLaren's car is good, both McLaren drivers benefit (teammate correlation)
4. Output the **full finish distribution** per player, not just expected value — this gives us P(1st), P(2nd)...P(8th) directly from simulation

**Impact**: MC simulation is the gold standard for this kind of multi-outcome problem. The full distribution also enables error bands and confidence intervals.

**References**:
- [R-bloggers — Elo, Monte Carlo, and Real Simulations](https://www.r-bloggers.com/2026/02/how-to-predict-sports-in-r-elo-monte-carlo-and-real-simulations/)
- [Sharp Alpha — Intro to Monte Carlo for Sports Prediction](https://sharpalpha.substack.com/p/an-intro-to-monte-carlo-simulation)
- [UChicago REU — Monte Carlo Simulations and Applications in Sports](http://math.uchicago.edu/~may/REU2022/REUPapers/Akuzawa.pdf)

**Verdict**: ✅ Enhance existing system. The MC infrastructure exists; feed it better inputs and extract richer outputs.

---

### Approach 7: Bayesian Prior Blending (Historical Base Rates)
**Theory**: Market odds reflect *current* information. But some sports have strong historical patterns that markets may not fully price. E.g., "How often does the preseason favorite actually win the championship?" In the NFL, the preseason favorite wins ~20% of the time. In F1, the preseason favorite wins ~60% of the time. This **sport-specific predictability** should inform how much we trust the odds.

**Method**:
```
posterior_p = α × market_p + (1 - α) × historical_base_rate_for_this_odds_range
```
Where α = sport predictability weight (high for F1 where favorites dominate, low for NFL where parity is high).

For each odds range (e.g., +200 to +300), look up: "historically, what % of teams with these preseason odds actually won?" If the answer is higher than the implied probability, the market is underpricing favorites in this sport. If lower, it's overpricing them.

**References**:
- [Bayesian statistics meets sports: a comprehensive review](https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0106/html?lang=en)
- [Frontiers — Bayesian approach to predict performance in football](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1486928/full)
- [Nate Silver / FiveThirtyEight methodology](https://fivethirtyeight.com/methodology/how-our-nfl-predictions-work/) — uses Elo priors + Bayesian updating

**Verdict**: ✅ Implement for sports with enough historical data. Powerful for NFL, NBA, MLB, F1 where decades of preseason odds → actual results exist.

---

### Approach 8: Error Band Width as Draft Signal (Risk-Adjusted EV)
**Theory**: Two players with identical 60 EV are NOT equally valuable if one has ±5 uncertainty and the other has ±25. The narrow-band player is a "safe floor" pick; the wide-band player is a "boom or bust" gamble. In a snake draft, you want **safe floors early, upside later**.

**Method**: Already partially implemented via `confidenceScore.js`. Enhance by:
1. Computing **asymmetric error bands** — upside potential vs. downside risk separately
2. Using **Composite Confidence Score (CCS)** to produce risk-adjusted EV: `RA-EV = EV × (1 - risk_discount × (1 - CCS))`
3. For draft strategy: sort by RA-EV in early rounds (minimize regret), sort by raw EV + upside in late rounds (maximize ceiling)
4. Flag "cliff picks" — players where waiting one more round risks losing them (velocity/drop-off already partially exists)

**Key error band drivers**:
- Model disagreement (ikynEV vs waEV spread)
- Odds source disagreement (DraftKings vs FanDuel vs Pinnacle spread)
- Sport predictability (F1 = narrow bands, March Madness = wide bands)
- Sample size proxy (NBA 82-game season = narrow, single-elimination = wide)

**References**:
- [Kelly Criterion and bankroll management](https://en.wikipedia.org/wiki/Kelly_criterion) — Kelly implicitly penalizes high-variance bets
- [FiveThirtyEight uncertainty quantification](https://fivethirtyeight.com/methodology/how-our-nfl-predictions-work/) — 50k simulations to show range

**Verdict**: ✅ Enhance existing CCS system. Critical for draft strategy layer on top of EV.

---

## Implementation Priority

### Phase 1: Fix the Foundation (Win Probability)
1. **Shin/Power devigging** (Approach 1) — Replace basic normalization
2. **Log-odds modifier framework** (Approach 3) — Build the adjustment engine
3. **Entropy-weighted confidence** (Approach 4) — Auto-calibrate modifier strength per sport

### Phase 2: Enrich the Rank Distribution
4. **Multi-market triangulation** (Approach 2) — Where data exists, anchor P(top 4/8)
5. **Enhanced MC simulation** (Approach 6) — Feed adjusted probs into simulator
6. **Bayesian prior blending** (Approach 7) — Historical calibration layer

### Phase 3: Draft Strategy Layer
7. **Dynamic VOR** (Approach 5) — Data-driven replacement levels
8. **Risk-adjusted EV with asymmetric error bands** (Approach 8) — Draft-round-aware scoring

---

## Modifier Philosophy

**The market is mostly right.** Our edge comes from:
1. **Better devigging** (Shin/Power vs. basic normalization) — 1-3% edge
2. **Information the market doesn't price for fantasy** — playoff seeding doesn't matter for betting, but affects fantasy finish position
3. **Cross-sport opportunity cost** — betting markets don't care about draft capital allocation across sports; we do
4. **Temporal information decay** — futures odds are set months before season start; we can incorporate fresher information
5. **Structural market inefficiency** — thin markets (LLWS, snooker, AFL) have wider vig and less sharp money

**What NOT to do**:
- Don't override the market with gut feelings
- Don't apply large modifiers (>0.20 logit) without strong evidence
- Don't modify EV directly — always modify probability, then derive EV
- Don't assume our model is smarter than Pinnacle for high-liquidity sports

---

## Key Data Science Concepts Referenced

| Concept | Application | Source |
|---------|------------|--------|
| Plackett-Luce model | Rank distribution from win probability | [Statistical Odds & Ends](https://statisticaloddsandends.wordpress.com/2024/04/24/what-is-the-plackett-luce-model/) |
| Shin's method | Favorite-longshot bias correction | [Shin Python package](https://github.com/mberk/shin) |
| Shannon entropy | Market efficiency measurement | [Gambling & Information Theory](https://en.wikipedia.org/wiki/Gambling_and_information_theory) |
| Kelly criterion | Optimal bet sizing / value quantification | [Kelly criterion](https://en.wikipedia.org/wiki/Kelly_criterion) |
| Value Over Replacement | Draft positional scarcity | [FantasyPros VBD](https://www.fantasypros.com/2025/06/fantasy-football-draft-strategy-value-based-drafting-vorp-vols-vona/) |
| Bayesian updating | Prior + likelihood → posterior probability | [Bayesian sports review](https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0106/html?lang=en) |
| Closing Line Value | Sharp vs. soft book edge detection | [Pinnacle CLV](https://www.pinnacle.com/betting-resources/en/educational/what-is-closing-line-value-clv-in-sports-betting) |
| Monte Carlo simulation | Full season distribution modeling | [R-bloggers MC guide](https://www.r-bloggers.com/2026/02/how-to-predict-sports-in-r-elo-monte-carlo-and-real-simulations/) |
| Elo ratings | Power rating → win probability bridge | [FiveThirtyEight Elo](https://fivethirtyeight.com/methodology/how-our-nfl-predictions-work/) |
| Log-odds (logit) transform | Safe probability adjustment space | Standard statistical methodology |

---

## File Architecture (Implemented + Proposed)

### Already Implemented (Phase 1)
```
src/services/
  oddsConverter.js       — ✅ Shin/Power/Basic devig methods + source sharpness weighting
  evCalculator.js        — ✅ Dynamic replacement levels based on leagueSize

server/services/
  oddsConverter.js       — ✅ Power devig + source sharpness weighting (server mirror)

src/utils/
  storage.js             — ✅ leagueSize in CONFIG_DEFAULTS (default: 12)

src/components/layout/
  Header.jsx             — ✅ Pixelated gear icon + settings popover (league size dropdown)
  Layout.jsx             — ✅ leagueSize prop passthrough

src/App.jsx              — ✅ leagueSize state, persistence, wired to useOddsData
src/hooks/useOddsData.js — ✅ leagueSize flows to applyPositionalScarcity
```

### Proposed (Phase 2+)
```
src/services/
  modifierEngine.js      — NEW: log-odds modifier framework
  marketConfidence.js    — NEW: entropy-based confidence scoring

src/data/
  modifiers/             — NEW: per-sport modifier data files
  historicalRates.js     — NEW: historical base rates per sport per odds range

src/utils/
  confidenceScore.js    — Enhanced asymmetric error bands
```

---

## Resolved Design Decisions

1. **Odds sources**: Scrape publicly available odds from any site. Pinnacle/Betfair get highest sharpness weight in consensus; US soft books (DraftKings, FanDuel, BetMGM) get lower weight. See `SOURCE_SHARPNESS` in `oddsConverter.js`.

2. **League size**: Variable — user selects 10, 12, 14, or 16 teams via the gear icon popover in the header. Stored in Netlify Blobs under `app-settings.leagueSize`. Default: 12. Dynamically affects replacement level and VOR calculations.

3. **Top-4 / make-playoffs odds**: Collected manually as **confidence modifiers** — used to constrain rank distribution error bands and validate the PL model, NOT as absolute probability anchors. They add depth and confidence to the P(2nd)–P(8th) estimates.

4. **Devigging method**: Power method is the default (best balance of accuracy and bias correction). Shin method available for full-field markets. Basic normalization kept as fallback. Applied per-source before sharpness-weighted consensus.

---

## Palou Calibration Walkthrough

To verify the model produces ~84 EV for Palou (IndyCar, QP tournament):

1. **Collect odds**: Palou championship odds ≈ +150 → implied P(win) ≈ 40%
2. **Power devig**: Adjust from ~40% to ~42% (favorite-longshot bias correction)
3. **Modifiers** (Phase 2): +0.05 logit for reigning champion momentum, +0.03 for Ganassi team strength → ~45% adjusted
4. **PL rank distribution**: P(1st)=45%, P(2nd)≈20%, P(3rd)≈12%, P(4th)≈8%, P(5th-6th)≈8%, P(7th-8th)≈4%
5. **IndyCar has ~18 races**: Accumulate QP per race, convert to 0-100 scale
6. **Expected QP per race**: 45%×20 + 20%×14 + 12%×10 + 8%×8 + 8%×5 + 4%×3 = 14.16 QP/race
7. **Season QP**: 14.16 × 18 = 254.9 out of max 360 (18×20)
8. **Scaled EV**: (254.9 / 360) × 100 = **70.8** ... needs tuning via championship odds weighting

*Note: The exact calibration requires balancing per-race odds vs. championship odds. Championship odds already encode season-long accumulation. This is a key modeling decision — see Approach 2 (multi-market triangulation).*

---

## Odds Data Sources & API Key Setup

### Source Priority (by sharpness)
| Source | Type | API Key? | Sharpness | Coverage |
|--------|------|----------|-----------|----------|
| Pinnacle | Via The Odds API | Yes | 1.00 | Major sports |
| Betfair | Via The Odds API | Yes | 0.95 | Major sports |
| bet365 | Via scrapers | No | 0.85 | Broad |
| Polymarket | Public API | **No key needed** | 0.80 | NBA, NFL, MLB, NHL, NCAA, UCL, FIFA, F1 |
| DraftKings | Via The Odds API / scraper | Mixed | 0.75 | US sports |
| FanDuel | Via The Odds API / scraper | Mixed | 0.75 | US sports |
| BetMGM | Via The Odds API | Yes | 0.70 | US sports |
| Manual (screenshots) | `scripts/add-odds.js` | No | 0.60 | Any |

### API Key Setup Walkthrough

#### 1. The Odds API (PRIMARY — covers Pinnacle, DraftKings, FanDuel, BetMGM, bet365)

1. Go to https://the-odds-api.com/
2. Click "Get API Key" → enter email → they email you a key instantly
3. Free tier: **500 requests/month** (enough for ~1 fetch/day across all 20 sports)
4. Add to your app: Go to TERMINAL_CFG page → paste in the API key field
5. **Or** set as Netlify env var: `THE_ODDS_API_KEY=your_key_here`

This is the highest-value key because it returns odds from **multiple sportsbooks per query** including Pinnacle (the sharpest book). One request gives you DraftKings + FanDuel + Pinnacle + bet365 odds simultaneously.

#### 2. Polymarket (FREE — no key needed)

Already wired in. Runs automatically when pipeline executes. Polymarket is a prediction market (not a sportsbook) — its odds come from thousands of traders buying/selling shares. Quality is moderate but coverage includes championship futures for NBA, NFL, MLB, NHL, NCAA, UCL, FIFA, F1.

Polymarket slugs need updating each season. Current slugs in `netlify/functions/run-pipeline.js` → `POLYMARKET_SLUGS`.

#### 3. Manual Screenshot Workflow (for niche sports)

For sports with thin API coverage (AFL, Darts, Snooker, LLWS, IndyCar):
```bash
echo '[["Alex Palou", "+150"], ["Colton Herta", "+800"]]' | node scripts/add-odds.js indycar championship manual
```

### Sport Coverage Gaps

| Sport | The Odds API | Polymarket | Manual needed? |
|-------|-------------|------------|---------------|
| NFL | ✅ | ✅ | No |
| NBA | ✅ | ✅ | No |
| MLB | ✅ | ✅ | No |
| NHL | ✅ | ✅ | No |
| NCAA Football | ✅ | ✅ | No |
| NCAA Basketball | ✅ | ✅ | No |
| NCAA Women's | ✅ | ❌ | Maybe |
| WNBA | ✅ | ✅ | No |
| F1 | ✅ | ✅ | No |
| IndyCar | ✅ (added) | ❌ | Backup |
| AFL | ✅ | ❌ | Backup |
| UCL | ✅ | ✅ | No |
| FIFA | ✅ | ✅ | No |
| PGA | ✅ | ❌ | Per-major |
| Tennis M/W | ✅ | ❌ | Per-slam |
| CS2 | ✅ | ❌ | Maybe |
| Darts | ✅ | ❌ | Backup |
| Snooker | ✅ | ❌ | Backup |
| LLWS | ❌ | ❌ | **Yes** |
