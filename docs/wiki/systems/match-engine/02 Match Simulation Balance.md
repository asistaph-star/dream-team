# Match Simulation Balance

This document details the gameplay balancing systems, possession speed recalibrations, crowd energy caps, Smart Fatigue scales, and the offline simulation testing tools.

---

## 1. Smart Fatigue (Stamina-Based Shot Selection)

### Core Mechanics
Instead of letting tired players repeatedly take heavy isolated attacks, the engine implements a **Smart Fatigue Filter** in [shotEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/shotEngine.ts) that dynamically reweights shot selection based on player stamina percent.

### Weight Modifiers
* **Medium Stamina (40% – 69%)**:
  - Heavy/Physical attacks: multiplied by `0.80` (less frequent).
  - Safe/Assisted shoots: multiplied by `1.10` (more frequent).
* **Low Stamina (20% – 39%)**:
  - Heavy/Physical attacks: multiplied by `0.50` (greatly discouraged).
  - Safe/Assisted shoots: multiplied by `1.25`.
* **Critical Stamina (<20%)**:
  - Heavy/Physical attacks: multiplied by `0.30` (rarely chosen).
  - Safe/Assisted shoots: multiplied by `1.35` (forced target).

> [!NOTE]
> This filter only adjusts the *likelihood* of selecting a specific shot type (e.g. driving dunk vs. spot-up catch-and-shoot). It does not directly mutate the shot success percentage formula, preserving natural emergence.

---

## 2. Possession Timing & Event Calibration

To align simulation scores with professional basketball averages, the frequency of high-speed events was recalibrated in `matchEngine.ts`:
* **Previous State**: Mirror simulations resulted in high-speed ticks averaging `10.59s` per possession, driving combined points to over `295` combined.
* **Calibrated State**: Reduced fast-event frequencies (fastbreak rates and quick isolation triggers) without changing raw clock intervals.
* **Result**:
  - Combined team score average: `224.3` points.
  - Average possession timing: `13.91s`.
  - Shot clock violations and quarter-ending buzzers trigger naturally.

---

## 3. Crowd Energy & Rally Rebalance

The background Crowd Energy / Team Rally booster system was calibrated to prevent snowballing scoring runs:
* **Home/Away Caps**: Softened the home energy boost and capped the away fatigue/contest penalties.
* **Rally Surge Nerf**: Softened the shooting bonus multiplier granted during a Rally mode state.
* **Emergency Rubbers**: No artificial scoring caps or rubber-banding mechanisms are used. Scoring remains fully emergent.

---

## 4. 3PT Additive Bonus Stacking Cap

To eliminate absurd games where positive modifiers stacked endlessly:
* **The Rule**: A strict cap was applied:
  ```typescript
  const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;
  ```
* **Scope**: Restricts the maximum combined positive additive shooting bonus to **+8.0%** for 3PT shot attempts. This caps stacked bonuses from home energy, matchup advantages, active learned skill bonuses, and data-pipeline efficiency boosts.
* **Asymmetry**: Negative adjustments (e.g. fatigue penalties, elite defensive contests) remain **uncapped** to preserve defensive locks.

---

## 5. Frontend-Equivalent Balance Harness (`sim_accurate_mock.ts`)

### Why It Was Needed
Playwright browser testing proved too slow and unstable for rapid engine testing, while the old `debug_mock.ts` script was invalid because it omitted user bench substitutions and fatigue recovery. This created a false "collapse" state where simulated players played at 0% stamina, producing skewed 65%+ 3PT make rates in test outputs.

### The Solution
A Node-equivalent balance runner was built at `src/scripts/balance/sim_accurate_mock.ts`. It perfectly mirrors the browser's React lifecycle:
* **User & AI Substitutions**: Swaps players out automatically when stamina drops below normal bounds.
* **Bench & Half Recovery**: Grants correct recovery ticks (+15 active, +5 bench at half).
* **Strategy Impact**: Applies `computeEffective` strategy adjustments in real-time.
* **Standard Logs**: Simulates and outputs realistic, balanced games (scores in the 86–118 range) with realistic 3P% (~40.6% for elite teams).
