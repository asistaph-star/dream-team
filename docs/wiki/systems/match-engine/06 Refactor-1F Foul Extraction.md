# Refactor-1F — Foul Helper Extraction

**Phase:** Refactor-1F
**Commit:** `809c862`
**Branch:** master
**Date:** 2026-06-04
**Type:** Behavior-preserving refactor — pure formulas only

---

## What Was Done

Created [`src/lib/match/foulSystem.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/foulSystem.ts) with pure constants, scalers, and formulas extracted from `matchEngine.ts`.

Updated [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) to import and use those helpers.

Created [`src/scripts/validation/test_foul_helpers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_foul_helpers.ts) — 42 validation checks, 42/42 passed.

Updated [`src/scripts/validation/test_four_point_bait_hybrid_regression.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_four_point_bait_hybrid_regression.ts) to parse target lines dynamically at startup, avoiding failures due to line-drift from code modifications in `matchEngine.ts`.

Updated [`src/scripts/validation/test_shooting_foul_symmetry.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_shooting_foul_symmetry.ts) to look for the new helper call signature.

---

## Extracted Helpers (foulSystem.ts)

| Helper | Description |
|---|---|
| `FOUL_W` | Position-based foul committer weight constants: `{ PG: 1.4, SG: 1.2, SF: 1.0, PF: 0.8, C: 0.6 }` |
| `getPositionFoulWeight(position)` | Returns weight for a position, falling back to `1.0` if unknown |
| `getFoulStaminaModifier(avgStamina)` | Maps defender avg stamina to multipliers: `avg >= 70 ? 1.0 : avg >= 50 ? 1.12 : avg >= 30 ? 1.28 : 1.45` |
| `getClutchRatingByRarity(rarity)` | Maps player rarity to clutch bonus: `Mythic: 0.13, Legendary: 0.09, Epic: 0.04, Rare: 0.00, Common: -0.03` |
| `calculateCrowdNoisePenalty(...)` | Calculates away team free throw noise penalty, scaled by crowdEnergy, clutch intensity, and rarity resistance |
| `calculateFreeThrowChance(...)` | Computes final free throw probability, clamped to `[0.50, 0.95]` |
| `calculateBaseShootingFoulChance(...)` | Base shooting foul chance, starting at `0.044` for 3PT and `0.086` for non-3PT, scaled by stamina and foul-draw, plus optional clutch bonus |
| `calculateFoulDrawModifier(...)` | Standardizes `0.90 + foulDrawTendency * 0.25` |
| `calculateFlopIdentityScale(...)` | Standardizes Flop X activation scaler: `0.90 + foulDrawTendency * 0.20` |
| `calculateFourPointBaitIdentityScale(...)` | Standardizes Four-Point Bait X activation scaler |
| `calculateComposureIdentityScale(...)` | Standardizes Composure Shield activation scaler |
| `calculateCleanContestIdentityScale(...)` | Standardizes Clean Challenge activation scaler |
| `calculateDisciplineScale(...)` | Standardizes Discipline Wall shot quality penalty scaler |
| `calculateFourPointBaitBoost(...)` | Returns dynamic hybrid synergy boost: `both Level >= 1 ? 0.090 : either Level >= 1 ? 0.045 : 0.020` |

All extracted formulas are pure mathematical helpers with no `Math.random()`, no state mutations, and no event logs.

---

## What Stayed in matchEngine.ts

| Symbol / Logic | Reason |
|---|---|
| `pickFoulCommitter` | Contains `Math.random()` to randomly select the committing defender; moving it would alter RNG sequence |
| `runFTSequence` | Tightly coupled with state mutations (`newPlayerStats`, `newTeamStats`), event logging, possession changes, and rebounding logic |
| `Math.random()` rolls | All RNG rolls (shooting foul checks, free throw attempts, flop triggers, archetype activations) remain in `matchEngine.ts` to strictly maintain the game's simulation seed order |
| Foul-out logic | Accesses and mutates state arrays, changes lineups, dispatches match logs |
| Event logs | Tied directly to state-dependent details, text interpolation, and formatting |
| And-one logic | Coupled with shot result logic, stats mutations, and possession progression |

---

## Invariants Preserved

| Invariant | Status |
|---|---|
| `MAX_SHOOTING_FOUL_CHANCE` = **0.28** | ✅ Preserved |
| Four-Point Bait hybrid synergy boost: **0.020 / 0.045 / 0.090** | ✅ Preserved |
| Free throw probability clamp: `[0.50, 0.95]` | ✅ Preserved |
| Flop X behavior | ✅ Unchanged |
| SGA Flop behavior | ✅ Unchanged |
| Foul Magnet modifier | ✅ Unchanged |
| Composure Shield behavior | ✅ Unchanged |
| Clean Challenge behavior | ✅ Unchanged |
| Discipline Wall behavior | ✅ Unchanged |
| And-one logic | ✅ Unchanged |
| Free throw logic | ✅ Unchanged (except delegation to pure helper) |
| Dynamic line detection in validation scripts | ✅ Still strictly validates User and AI paths |
| No gameplay math, scoring, stamina, or event log changes | ✅ Preserved |
| No saved data changes | ✅ Preserved |
| No OVR/star-up changes | ✅ Preserved |
