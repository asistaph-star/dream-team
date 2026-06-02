# NBA Data Model & Market Calculations

This page documents the mathematical models, ESPN Glossary ratings, daily momentum scores, price lookups, and card-merging pipelines.

---

## 1. Calculated Season Rating (ESPN Glossary Formula)

The data pipeline fetches raw player stats from NBA.com and computes a standard **Calculated Season Rating** to act as the primary season rating anchor:

```text
Season Rating =
  PTS + REB + 1.4*AST + STL + 1.4*BLK - 0.7*TOV
  + FGM + 0.5*FG3M - 0.8*(FGA - FGM)
  + 0.25*FTM - 0.8*(FTA - FTM)
```

### ACCENT & SUFFIX NORMALIZATION
To prevent mismatches between NBA.com raw strings and implemented players:
* Names are normalized to strip accents (e.g. `Nikola Jokić` → `Nikola Jokic`, `Luka Dončić` → `Luka Doncic`).
* Common suffixes (e.g., `Jr.`, `III`) are stripped or matched selectively.

---

## 2. Daily Momentum & Update Formula

Daily updates compare today's box scores against yesterday's previous baselines to calculate a **Daily Momentum** score:

### Stat Differences
```python
d_pts = today_pts - prev_pts
d_blk = today_blk - prev_blk
d_stl = today_stl - prev_stl
d_ast = today_ast - prev_ast
d_reb = today_reb - prev_reb
```

### Sign-Dependent Weights
```python
today_pts_calc = (
    d_pts * (5.0 if d_pts > 0 else 3.5) +
    d_blk * (10.0 if d_blk > 0 else 7.0) +
    d_stl * (10.0 if d_stl > 0 else 7.0) +
    d_ast * (1.5 if d_ast > 0 else 1.0) +
    d_reb * (1.5 if d_reb > 0 else 1.0)
)
```

### Event Boosters
* **Consistency Boost**: `+30` if `abs(today_pts - prev_pts) <= 5` and both points are under 20 (rewards solid role-player consistency).
* **Breakout Boosts**: `+15` if assists increase by `5+`, and `+15` if rebounds increase by `5+`.

---

## 3. Market Score and Rank Calculations

A player's rank is decided by their **Market Score**, anchoring their rank in the global market:

```python
market_score = season_rating + daily_momentum * 0.035
```

> [!NOTE]
> Daily momentum is scaled by a factor of `0.035`. This ensures that daily game outcomes serve as light modifiers to move adjacent players up or down, but a single poor game can never erase a player's season-long baseline rank.

---

## 4. Card Price and Salary Calculations

Prices and Salaries scale logically with player updates:
* **Price**: Mapped from the static rank table in `db_Rankings_calcu.csv`.
* **Salary**:
  - `baseSalary`: Mapped as `int(base_ovr * 12.5)` (represents the card's initial season salary baseline).
  - current `salary`: Mapped as `int(guarded_ovr * 12.5)` (adjusts dynamically based on today's clamped OVR).
  - `salaryTrend`: Compares current salary against `baseSalary` (`up` if higher, `down` if lower).

---

## 5. Roster Merging & Attributes Mapping

1. **Roster Merging**: The generated `players_update.json` snapshot is merged into the smaller implemented player list inside `src/lib/data/mockPlayers.ts` by normalized player name.
2. **Attributes Derivation**: [nbaAttributeMapper.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/nbaAttributeMapper.ts) extracts raw statistics (such as `twoPct`, `threePct`, `ftPct`, `assistsPerGame`, Deflections, etc.) to derive the card's detailed gameplay attributes.
3. **Sim Interactivity**: derived attributes and real volume/efficiency percentages are read directly by the match engine, ensuring live performance reflects actual player strengths.
