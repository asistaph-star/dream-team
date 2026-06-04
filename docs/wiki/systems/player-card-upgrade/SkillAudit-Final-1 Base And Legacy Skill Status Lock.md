# SkillAudit-Final-1 — Full 22 Base Skills + 15 Legacy Special Skills Status Lock

**Phase:** SkillAudit-Final-1  
**Date:** 2026-06-04  
**Type:** Audit and Status Lock Phase Only — Code untouched  

---

## Overview

This document establishes the final truth table and architecture status for all **22 Base Skills** and **15 legacy Special / Learned Skills**. No gameplay code, trigger rates, archetypes, or RNG sequences were modified in this phase. The goal is to provide a single, stable source of truth mapping active implementations, legacy behaviors, blocks, and mismatches.

---

## Part 1 — 22 Base Skills Audit

The 22 base skills are assigned from statistical seasonal averages through `assignBaseSkillsFromStats`. Below is the audit of their actual execution behavior in `matchEngine.ts` and `skillResolver.ts`.

### Offense Base Skills (7)

| Skill Name | Trigger Condition | Uses `rollBaseSkill` | Rating / Helper Used | Archetype Signals | Counters / Countered By | Code Effect | Doc Accuracy | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Arc Pressure** | Opponent shot is a 3PT attempt (`is3PT`). | Yes | `getThreePtRating` | `shooting` | Countered by `Dead Air X`, `Shadow Guard`, `Focus Lock` | Adds `+0.035 * arcScale` to `skillShotBonus`. Triggers `Red Dot X` setup on success. | Accurate | **LOCKED** |
| **Paint Magnet** | Opponent shot is a 2PT/interior attempt (`!is3PT`). | Yes | `getFinishingRating` | `stamina-drain`, `foul-draw`, `rebound`, `paint-bully` | Countered by `Dead Air X` | Adds `+0.03 * paintScale` to `skillShotBonus`. Applies `Tilted` mark if defender stamina is $< 45\%$. | Accurate | **LOCKED** |
| **Power Driver** | Opponent shot is a 2PT attempt (`!is3PT`) with a `primaryDefender` present. | Yes | `getFinishingRating`, `getStrengthRating` | `stamina-drain`, `foul-draw`, `rebound`, `paint-bully` | None | Adds `+0.02 * powerDriverShotScale` to `skillShotBonus`. Drains up to `36` defender stamina (base `32`). | Accurate | **LOCKED** |
| **Mismatch Caller** | Shot is attempted and the defender carries any active mark. | Yes | Static | `foul-draw`, `shooting`, `paint-bully` | Countered by `Dead Air X` | Adds `+0.025` to `skillShotBonus` (`+0.005` if jammed by Dead Air X). | Accurate | **LOCKED** |
| **Glass Touch** | Missed shot rebound resolution. | Yes | `getReboundRating` | `rebound`, `paint-bully` | Opposed by `Paint Barrier` | Calculates `glassScale` to boost team OREB chance by `+0.055 * glassScale` (clamped to max `0.36`). | Accurate | **LOCKED** |
| **Foul Magnet** | Shooting foul check, and the `primaryDefender` has stamina $< 60\%$. | Yes | `getFoulDrawTendency` | `foul-draw` | None | Adds `+0.035 * foulMagnetScale` to `sfChance` (clamped to max `0.28`). | Accurate | **LOCKED** |
| **Tempo Surgeon** | Any shot attempt. | Yes | `getHandleRating`, `getAssistRating` | `foul-draw`, `playmaking`, `shooting` | Countered by `Dead Air X` | Adds `+0.018 * tempoScale` to `skillShotBonus` (`+0.003` if jammed). | Accurate | **LOCKED** |

### Defense Base Skills (7)

| Skill Name | Trigger Condition | Uses `rollBaseSkill` | Rating / Helper Used | Archetype Signals | Counters / Countered By | Code Effect | Doc Accuracy | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Shadow Guard** | Opponent triggers `Arc Pressure` (and `Dead Air X` did not block it). | Yes | `getOnBallDefenseRating` | `stamina-drain`, `gameplan` | Counters `Arc Pressure` | Contests shooting, reducing Arc Pressure's shooting bonus to `0.015 / shadowScale`. | Accurate | **LOCKED** |
| **Focus Lock** | Opponent triggers `Arc Pressure`, and both `Dead Air X` and `Shadow Guard` fail. | Yes | `getOnBallDefenseRating` | `stamina-drain`, `foul-draw`, `gameplan` | Counters `Arc Pressure` | Contests shooting, reducing Arc Pressure's shooting bonus to `0.020 / focusScale`. | Accurate | **LOCKED** |
| **Discipline Wall** | Opponent triggers `Four-Point Bait X`, and both Composure and Clean Contest fail. | Yes | `getOnBallDefenseRating` | `stamina-drain`, `gameplan` | Counters `Four-Point Bait X` | Blocks foul boost and applies `−0.03 * disciplineScale` SQ penalty to the shooter. | Accurate | **LOCKED** |
| **Hands Active** | Defensive possession tick start. | Yes | `getStealRating` | `stamina-drain` | None | Multiplies team steal/turnover chance by `1.18 * handsActiveScale`. | Accurate | **LOCKED** |
| **Rim Warden** | Opponent shot contest/block check. | Yes | `getBlockRating` | `rebound`, `paint-bully` | Counters interior shots | Increases blocker's base block rate modifier from `0.055` to `0.095`. | Accurate | **LOCKED** |
| **Screen Breaker** | Defensive tick start, and opponent runs `"Pick & Roll"` or `"Motion Offense"`. | Yes | `getOnBallDefenseRating` | `stamina-drain`, `gameplan` | Counters P&R and Motion | Multiplies team turnover chance by `1.12 * screenBreakerScale`. | Accurate | **LOCKED** |
| **Paint Barrier** | Missed shot rebound resolution. | Yes | `getReboundRating` | `rebound` | Counters `Glass Touch` | Calculates `barrierScale` to reduce opponent's OREB chance by `-0.060 * barrierScale`. | Accurate | **LOCKED** |

### Comprehensive Base Skills (8)

| Skill Name | Trigger Condition | Uses `rollBaseSkill` | Rating / Helper Used | Archetype Signals | Counters / Countered By | Code Effect | Doc Accuracy | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Complete Engine** | Passive benefit when player is on court. | No | `getOffenseRating`, `getOnBallDefenseRating`, `getAssistRating` | `foul-draw`, `playmaking`, `shooting`, `gameplan` | None | Boosts team skill trigger rates by `+4% * completeEngineScale` if holder stamina $\ge 40\%$. | Accurate | **LOCKED** |
| **Iron Motor** | Passive check on every tick, and when receiving stamina drains. | No | `getStaminaRating` | `stamina-drain`, `rebound`, `paint-bully` | Mitigates stamina drains | 1. Ticks recover `12 * scale` stamina if stamina $\le 70\%$.<br>2. Multiplies all incoming drains by `0.65x`. | Accurate | **LOCKED** |
| **Connector Hub** | Made basket with an assist awarded to the holder. | Yes | `getAssistRating` | `playmaking`, `shooting` | None | Recovers `35 * connectorScale` stamina to the scorer. | Accurate | **LOCKED** |
| **Tempo Switch** | Any shot attempt where possession pace is `"fastbreak"` or `"early_offense"`. | Yes | Static | `playmaking`, `shooting` | None | Adds `+0.025` (+2.5%) to `skillShotBonus`. | Accurate | **LOCKED** |
| **Position Flex** | Passive check during shot resolution. | No | Static | `playmaking`, `shooting`, `gameplan` | None | Adds `+0.02` (+2.0%) to matchup bonus. | Accurate | **LOCKED** |
| **Future Core** | Passive check in `applyGreenSupport` per tick. | No | Static | `playmaking`, `gameplan` | None | Restores `+0.006` form rating per tick if current form is $< 1.0$. | Accurate | **LOCKED** |
| **Share Rhythm** | Made basket with an assist. | Yes | `getAssistRating` | `playmaking` | None | Recovers `8 * shareRhythmScale` stamina to all 5 active teammates. | Accurate | **LOCKED** |
| **Enforcer Lift** | Tick start, and `foulsThisQuarter > 0`. | Yes | `getOnBallDefenseRating`, `getStrengthRating`, `getStaminaRating` | `stamina-drain`, `rebound`, `paint-bully` | None | Recovers `6 * enforcerLiftScale` stamina to all 5 active teammates. | Accurate | **LOCKED** |

---

## Part 2 — Legacy Special / Learned Skills Audit

The 15 legacy special/learned skills are active and trigger in matches via legacy exact strings (e.g. `Red Dot X`, `Four-Point Bait X`).

| Legacy Skill | Mechanic ID | Family ID | Trigger Condition | Archetype Gating | Mark / Consequence | Code Effect | Symmetrical | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Red Dot X** | `DEEP_STRIKE_EXPOSE_SETUP` | `DEEP_STRIKE` | Successful Arc Pressure perimeter shot. | Shooting / Deep Strike | Applies `Exposed` (2 pos) | Sets up `Exposed` on target. Trigger rate `300 * scale`. | Yes | **LOCKED** |
| **Four-Point Bait X** | `DEEP_STRIKE_FOUR_POINT_BAIT` | `DEEP_STRIKE` | 3PT attempt on `Exposed` defender. | Shooting + Foul-Draw (Hybrid) | Requires `Exposed` | Adds foul pressure: `+0.02` (no archetype), `+0.045` (one), `+0.09` (both). Capped at `0.28`. | Yes | **LOCKED** |
| **Lung Burner X** | `POSTER_SPARK_LUNG_BURNER` | `POSTER_SPARK` | Made basket, defender has any mark. | Paint Bully | Requires any mark. Adds +10 drain if target has `Debt` | Drains stamina (bronze 20, silver 30, gold 40). Capped at 40. Anti-snowball checks apply. | Yes | **LOCKED** |
| **Chain Pass X** | `COURT_VISION_CHAIN_PASS` | `COURT_VISION_ENGINE` | Made basket, assist awarded. | None | Applies `Debt` (2 pos) | Places `Debt` mark on lowest-stamina opponent defender. | Yes | **LOCKED** |
| **Debt Collector X** | `GAMEPLAN_DEBT_COLLECTOR` | `LOCK_CHAIN` | Lung Burner X triggers on `Debt` target. | None | Consumes `Debt` on target | Drains `45` stamina from 2 additional opposing players. | Yes | **LOCKED** |
| **Five-Man Squeeze X** | `DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE` | `DEFENSIVE_ANCHOR` | Defending team secures block or steal. | None | Checks marked opponents | Drains 40 stamina from all 5 active opponents (60 if 3+ are marked). | Yes | **LOCKED** |
| **Cold Timeout X** | `TIMEOUT_RESET_CLEANSE` | `TIMEOUT_RESET` | Tick end, average stamina $< 65\%$ or any mark active. | None | Cleanses 1 oldest mark | Cleanses 1 mark from all marked active teammates. Recovers 12 stamina for 1-2 tired players. | Yes | **LOCKED** |
| **Dead Air X** | `GAMEPLAN_DEAD_AIR` | `GAMEPLAN_JAMMER` | Opponent attempts base skill. | None | Applies `Static` (2 pos) | Blocks base skill effect (reducing shot bonus to `0.005`). | Yes | **LOCKED** |
| **Clean Contest X** | `CLEAN_CHALLENGE_CONTEST` | `CLEAN_CHALLENGE` | Opponent Flop X or 4PT Bait triggers. | None | None | Reduces Flop X bonus by 50%, or blocks 4PT Bait and subtracts `-0.03` SQ. | Yes | **LOCKED** |
| **Contact Tax X** | `POSTER_SPARK_CONTACT_TAX` | `POSTER_SPARK` | 2PT attempt, defender stamina $< 65\%$. | Paint Bully | Applies `Tilted` (3 pos) | Drains stamina (bronze 10, silver 11, gold 12). Anti-snowball checks apply. | Yes | **LOCKED** |
| **Cage Step X** | `LOCK_CHAIN_CAGE_STEP` | `LOCK_CHAIN` | Defensive tick start. | None | Applies `Hooked` (2 pos) | Multiplies opponent turnover chance by `1.12`. Hooked targets lose 38 stamina per possession. | Yes | **LOCKED** |
| **Corner Trap X** | `DEFENSIVE_ANCHOR_CORNER_TRAP` | `DEFENSIVE_ANCHOR` | Opponent 3PT shot attempt. | None | Applies `Pinned` (2 pos) | Reduces opponent shot bonus by `-0.025`. **Mismatch:** Pinned cleared before bench recovery. | Yes | **MISMATCH / DECISION NEEDED** |
| **Pressure Coach X** | `GAMEPLAN_PRESSURE_COACH` | `BENCH_CAPTAIN` | Tick start. | None | Checks marked opponents | Drains 12 stamina from each marked opponent. | Yes | **LOCKED** |
| **Flop X** | `FLOP_SELL_CONTACT` | `FLOP` | Opponent contests shot, defender is `Tilted`. | Blocked (no scaling) | Requires `Tilted` | Adds `0.04` (SGA `0.08`) foul chance. Capped at `0.28`. | Yes | **LOCKED** |
| **Composure X** | `COMPOSURE_SHIELD_CANCEL` | `COMPOSURE_SHIELD` | Opponent Flop X or 4PT Bait triggers. | None | None | Cancels forced foul pressure and reduces opponent shot bonus by `-0.02`. | Yes | **LOCKED** |

---

## Part 3 — Blocked Family Skills Status

To maintain baseline simulation and progression stability, the following families remain intentionally blocked:

### POSTER_SPARK
* **Status:** **BLOCKED**
* **Trigger Gating:** No native rolling under family ID `POSTER_SPARK` is enabled.
* **Legacy Mapping:** Legacy skills `"Contact Tax X"` and `"Lung Burner X"` function using the safe, rebalanced stamina scaling.
* **Prerequisites for Activation:** Implementation of native `POSTER_SPARK` must await a dedicated balance decision.

### GAMEPLAN_JAMMER
* **Status:** **BLOCKED**
* **Trigger Gating:** No native rolling under family ID `GAMEPLAN_JAMMER` is enabled.
* **Legacy Mapping:** Legacy `"Dead Air X"` and `"Debt Collector X"` function normally.
* **Prerequisites for Activation:** Locked as blocked because Anti-Meta base skills combined with legacy Dead Air X are already highly effective; adding more disruption risks severe scoring collapses.

### New Family Rolling Pool
* **Status:** **BLOCKED**
* **Rolling Pool Gating:** The 15-family rolling pool is disabled. Only legacy skill names map to active mechanics and trigger in matches.

---

## Part 4 — Known Mismatches & Decisions Needed

### 1. Pinned Bench-Cleansing Mismatch
* **Documented Consequence:** Corner Trap X documentation states that `Pinned` players cannot recover stamina on the bench.
* **Code Conflict:** Substitution logic clears all active marks from a player's state the moment they leave the court. Consequently, `Pinned` is removed before the bench recovery routine executes, rendering this block inactive.
* **Decision Needed:** A future design phase must determine whether `Pinned` marks should persist on the bench, or if the substitution cleansing rule is the desired behavior.

---

## Part 5 — Verification and Regressions

* **TypeScript Compilation:** Verified cleanly through `npx tsc --noEmit`.
* **Regression Suite:** Checked and confirmed that all archetype and skill-specific test suites (`test_lineup_archetypes.ts`, `test_anti_flop_counters.ts`, `test_paint_bully_regression.ts`, `test_rebound_regression.ts`, `test_shooting_regression.ts`) pass without failures.
