# OVR Source Rules

This document outlines the strict guidelines governing player Overall Ratings (OVR), eligibility, and the daily stability caps that prevent rapid OVR fluctuations.

---

## 1. Overall Rating (OVR) Independence

### Core Principle
A player card's OVR represents their real-life current-season performance in the NBA.
* OVR comes strictly from the NBA Data Pipeline.
* **Star-up upgrades must never change OVR**. Card ascension only increases underlying gameplay attributes and unlocks learned skill slots.
* *Example*: A player card can stay at **79 OVR** but have gameplay attributes (e.g. Rebound, Calm) exceeding `300+` after star upgrades. The card is still rated relative to real NBA performance, while gameplay scaling remains uncapped.

---

## 2. Eligibility Filters

To prevent low-sample size outliers (e.g., players signing 10-day contracts or playing garbage-time minutes) from skewing the rankings, the daily mapping script filters out player records that do not meet the following criteria:
1. **Games Played**: Must have played at least **10 games** in the current season.
2. **Minutes**: Must average at least **8 minutes per game**.
3. **Active Team**: Must have a valid active NBA team abbreviation in the dataset.

---

## 3. Rank-to-OVR Mapping Table

OVR is resolved by mapping each player's calculated season rating rank into fixed brackets:

| Calculated Season Rank | Assigned OVR | Card Rarity Class |
|---|---|---|
| **Rank 1** | **99 OVR** | Mythic / Legendary |
| **Rank 2 – 5** | **98 OVR** | Mythic / Legendary |
| **Rank 6 – 10** | **96 OVR** | Legendary |
| **Rank 11 – 15** | **94 OVR** | Legendary |
| **Rank 16 – 25** | **91 OVR** | Epic |
| **Rank 26 – 40** | **88 OVR** | Epic |
| **Rank 41 – 100** | **82 OVR** | Rare |
| **Rank 101 – 200** | **77 OVR** | Rare |
| **Rank 201 – 400** | **72 OVR** | Common |
| **Rank 410 – 600** | **67 OVR** | Common |
| **Rank 601 – 800** | **62 OVR** | Common |
| **Rank 801+** | **55 OVR** | Common |

---

## 4. OVR Stability Daily Guardrail

To prevent high-scoring games or bad slumps from causing unrealistic OVR changes, the daily sync script implements an **OVR Stability Guardrail**:

* **Did Not Play / Frozen Days**: `0` OVR movement.
* **Normal Game**: Clamped to a maximum of **+/-1 OVR** change per day.
* **Strong Breakout / Collapse**: Clamped to a maximum of **+/-2 OVR** change per day.
* **Huge Breakout Event**: Clamped to a maximum of **+3 OVR** change.

### Saved Fields
The daily generated `players_update.json` tracks:
- `ovr`: The guarded, clamped OVR used actively by the frontend.
- `rawOvr`: The absolute OVR mapped directly from the daily calculated rank before clamping.
- `ovrDeltaCap`: The daily cap applied to that specific update tick.
