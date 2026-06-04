# Refactor-1I — Special Skill Hook Audit

**Phase:** Refactor-1I
**Date:** 2026-06-04
**Type:** Audit and Design Phase Only — Code untouched

---

## Decision

Leave all special skill activation hooks inside [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) for now. **No code extraction was performed in this phase.**

---

## Reason for Decision

* **RNG Sequence Integrity:** Every `rollSpecialMechanic` call invokes `Math.random()`. Relocating these checks or changing their call order will alter the sequence of random rolls, desynchronizing the match simulator seed.
* **State and Side-Effect Coupling:** Skill hooks directly read and mutate complex contextual match states, including player stamina (`newStamina`), status marks (`newSkillMarks`), scores, and match events (`newEvents`).
* **Execution Gating:** The hook logic is heavily nested within specific conditional possession branches (e.g. shot type, FGA success, transition pace, etc.).
* **Rolling Pool Restrictions:**
  * `POSTER_SPARK` and `GAMEPLAN_JAMMER` special skill families remain intentionally blocked from rolling naturally (resolving to empty mechanics).
  * Only legacy skill names (such as `Red Dot X`, `Four-Point Bait X`, `Cage Step X`, `Cold Timeout X`) map to active mechanics and trigger in matches.
  * The new family rolling pool remains blocked.

---

## Special Skill Hooks Registry

The engine contains **21 active special skill mechanic checks** routed through `rollSpecialMechanic` or `hasSpecialSkillMechanic`.

| Mechanic ID | Legacy Skill | Family ID | Trigger Wording / Activation Condition | Gating / Archetype Multipliers |
| :--- | :--- | :--- | :--- | :--- |
| `DEFENSIVE_ANCHOR_TEAM_PRESSURE` | `Five-Man Squeeze X` | `DEFENSIVE_ANCHOR` | Defending phase start (if not fastbreak) | `stamina-drain` level: L2 $\rightarrow$ 1.15, L3 $\rightarrow$ 1.30 |
| `COURT_VISION_RHYTHM` | `COURT_VISION_ENGINE` | `COURT_VISION_ENGINE` | Assisted shot attempt | `playmaking` level: L0 $\rightarrow$ 0.85, L1 $\rightarrow$ 1.0, L2 $\rightarrow$ 1.05, L3 $\rightarrow$ 1.10 |
| `BENCH_CAPTAIN_STABILIZE` | `BENCH_CAPTAIN` | `BENCH_CAPTAIN` | Team avg stamina < 65% + lowest < 45% | `playmaking` level: L0 $\rightarrow$ 0.85, L1 $\rightarrow$ 1.0, L2 $\rightarrow$ 1.05, L3 $\rightarrow$ 1.10 |
| `LOCK_CHAIN_ON_BALL_PRESSURE` | `LOCK_CHAIN` | `LOCK_CHAIN` | Steal check or perimeter shot contest | Standard scale based on defender `onBall` + `steal` + `stamina` |
| `SKY_WALL_RIM_PRESSURE` | `SKY_WALL` | `SKY_WALL` | Opposing interior shot attempt | Standard scale based on defender `block` + `onBall` |
| `GLASS_STRIKE_REBOUND` | `GLASS_STRIKE` | `GLASS_STRIKE` | Missed-shot rebound resolution before OREB is finalized | **Glass Bully / Rebound** L1 $\rightarrow$ +0.015 OREB boost (0 putback), L2 $\rightarrow$ +0.025 OREB (+0.010 putback), L3 $\rightarrow$ +0.035 OREB (+0.015 putback). OREB cap: 0.36. |
| `DEEP_STRIKE_EXPOSE_SETUP` | `Red Dot X` | `DEEP_STRIKE` | Succeeded Arc Pressure perimeter shot | `shooting` level: L0 $\rightarrow$ 0.85, L1 $\rightarrow$ 1.0, L2 $\rightarrow$ 1.05, L3 $\rightarrow$ 1.10 |
| `DEEP_STRIKE_FOUR_POINT_BAIT` | `Four-Point Bait X` | `DEEP_STRIKE` | 3PT shot, defender marked `Exposed` | Gated by `shooting` + `foul-draw` hybrid (0.020 / 0.045 / 0.090) |
| `FLOP_SELL_CONTACT` | `Flop X` | `FLOP` | Shot attempt, defender marked `Tilted` | Standard scale based on foul draw tendency |
| `COMPOSURE_SHIELD_CANCEL` | `Composure X` | `COMPOSURE_SHIELD` | Opponent triggers Flop or 4PT Bait | Standard scale based on defender `calm` rating |
| `CLEAN_CHALLENGE_CONTEST` | `Clean Contest X` | `CLEAN_CHALLENGE` | Flop / 4PT Bait triggers, Composure fails | Standard scale based on `onBall` + `block` ratings |
| `GAMEPLAN_DEAD_AIR` | `Dead Air X` | `GAMEPLAN_JAMMER` | Opponent attempts base skill | Standard scale based on `onBall` + `stamina` ratings |
| `POSTER_SPARK_CONTACT_TAX` | `Contact Tax X` | `POSTER_SPARK` | 2PT shot, defender stamina < 65% | `paint-bully` level determines drain: L0 $\rightarrow$ 8, L1 $\rightarrow$ 10, L2 $\rightarrow$ 11, L3 $\rightarrow$ 12 |
| `POSTER_SPARK_LUNG_BURNER` | `Lung Burner X` | `POSTER_SPARK` | Made basket, defender has any mark | `paint-bully` level determines base drain: L0 $\rightarrow$ 15, L1 $\rightarrow$ 20, L2 $\rightarrow$ 30, L3 $\rightarrow$ 40 |
| `GAMEPLAN_DEBT_COLLECTOR` | `Debt Collector X` | `LOCK_CHAIN` | Lung Burner X succeeds on target with `Debt` | Standard scale based on `onBall` + `steal` + `stamina` |
| `COURT_VISION_CHAIN_PASS` | `Chain Pass X` | `COURT_VISION_ENGINE` | Made basket, assist is awarded | Standard scale based on passer's `assist` rating |
| `TIMEOUT_RESET_CLEANSE` | `Cold Timeout X` | `TIMEOUT_RESET` | End of possession, average team stamina < 45% | Standard scale based on `calm` + `stamina` ratings |
| `DEFENSIVE_ANCHOR_CORNER_TRAP` | `Corner Trap X` | `DEFENSIVE_ANCHOR` | Opponent 3PT shot, defender on court | Standard scale based on `onBall` + `stamina` ratings |
| `LOCK_CHAIN_CAGE_STEP` | `Cage Step X` | `LOCK_CHAIN` | Opponent turnover check phase | Standard scale based on `onBall` + `strength` ratings |
| `GAMEPLAN_PRESSURE_COACH` | `Pressure Coach X` | `BENCH_CAPTAIN` | Start of possession, opponent has marked players | Standard scale based on `assist` + `onBall` + `stamina` |

---

## Gating Mechanics & Archetypes

* **Defensive Anchor (`stamina-drain`):**
  * L0: Single-target stamina drain (`6 * scale`, cap 8) on primary ball handler.
  * L1: Team-wide stamina drain (`15 * scale`, cap 20) on all 5 active opponents.
  * L2: Same as L1, with trigger rate multiplied by `1.15`.
  * L3: Same as L1, with trigger rate multiplied by `1.30`.
* **GLASS_STRIKE (`rebound`):**
  * Gated at L0.
  * L1: +0.015 OREB boost (0 putback).
  * L2: +0.025 OREB (+0.010 putback).
  * L3: +0.035 OREB (+0.015 putback).
  * OREB cap remains strictly 0.36. Paint Barrier suppression remains active. Missed putbacks are non-recursive and end in DREB.
* **GLASS_STRIKE Trigger Wording:**
  * GLASS_STRIKE rolls during missed-shot rebound resolution before OREB chance is finalized. If triggered, it improves the OREB chance and may add a tiny putback conversion boost depending on rebound archetype level. It does not trigger only after an offensive rebound is already secured.

---

## Future Validation Requirements

A validation script `src/scripts/validation/test_special_skill_hooks.ts` must be created prior to special skill hook extraction. It must assert:
* Every active mechanic ID is mapped correctly.
* Every legacy skill maps to the expected mechanic ID.
* Blocked family IDs (like `POSTER_SPARK` and `GAMEPLAN_JAMMER`) do not trigger naturally.
* New family rolling pool remains blocked.
* Every archetype-gated mechanic keeps level values unchanged.
* User/AI hook counts are symmetrical where required.
* No RNG sequence is moved.
* No event logs change.

---

## Recommended Next Step
**Phase SkillAudit-Final-1 — Full 22 Base Skills + 15 Legacy Special Skills Status Lock**
Before extracting more special skill helpers, we need the final truth table for every base skill and legacy learned skill (finished, active but needs doc cleanup, legacy preserved, blocked intentionally, needs regression, needs future redesign).
