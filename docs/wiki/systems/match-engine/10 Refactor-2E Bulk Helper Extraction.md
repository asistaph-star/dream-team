# Refactor-2E — Bulk Match Engine Helper Extraction

**Phase:** Refactor-2E (Bulk Match Engine Helper Extraction)
**Date:** 2026-06-04
**Type:** Refactoring & Modularization — Complete

---

## Decision

Successfully extracted 4 groups of pure match-simulation helper functions from the monolithic [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) into their own self-contained modules under `src/lib/match/`. 

---

## Line Count Impact

* **Before Phase:** 3,715 lines
* **After Phase:** 3,526 lines
* **Reduction This Phase:** 189 lines
* **Total Cumulative Reduction (from original 3,837):** 311 lines

---

## Files Created & Modified

### New Helper Modules
1. [`src/lib/match/blockSystem.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/blockSystem.ts)
   * Extracted pickBlocker, getBlockRating, calculateBlockChance, getSkyWallIdentity, and calculateSkyWallScale.
2. [`src/lib/match/strategyEffects.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/strategyEffects.ts)
   * Extracted calculateOffensiveStrategyMultiplier, calculateStrategyLevelMultiplier, and checkStrategyDegradation.
3. [`src/lib/match/archetypeEffects.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/archetypeEffects.ts)
   * Extracted Bench Captain recovery and stabilizer, Defensive Anchor leadership checks and team-wide stamina reductions, Pressure Coach scales, and Enforcer multipliers.
4. [`src/lib/match/playerMatchModifiers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/playerMatchModifiers.ts)
   * Extracted getTovStamMod, getLowestStaminaPlayer, getPrimaryBallHandler, isEnergyDrinkLocked, and getUsageMod.

### Modified Files
* [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts)
   * Replaced monolithic inline block logic, strategy degradation conditionals, archetype scaling calculations, and various helper lookups with modular function imports.

### Validation Scripts Added
1. [`src/scripts/validation/test_block_system_helpers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_block_system_helpers.ts) (11 tests)
2. [`src/scripts/validation/test_strategy_effect_helpers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_strategy_effect_helpers.ts) (12 tests)
3. [`src/scripts/validation/test_archetype_effect_helpers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_archetype_effect_helpers.ts) (13 tests)
4. [`src/scripts/validation/test_player_match_modifier_helpers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_player_match_modifier_helpers.ts) (12 tests)

---

## Verification & Testing Summary

* **TypeScript Compilation:** Run clean with `npx tsc --noEmit`
* **New Helper Tests:** 48/48 tests passed across the 4 new suites.
* **Regression Suites:** All 14 existing regression suites passed successfully.
* **Event-Log Equivalence Check:** Verified that consolidating the 7 strategy revert check branches into a single loop over `checkStrategyDegradation()` preserves identical event counts and order:
  * **Consolidation Delta:** `newEvents.push` count reduced from 78 to 72 inline, representing pure loop aggregation.
  * **Press Revert Bugfix:** Fixed a pre-existing narrative bug where Full-court press and Half-court press reverts incorrectly printed `"Man-to-Man strategy collapsed: Team cannot maintain pace. Reverting to Man-to-Man"`. Reverts now correctly log the original press strategy name instead of the mutated target.

---

## Safety Scan Confirmation

* **RNG Sequence:** No `Math.random` rolls were relocated into the helper files. All RNG calls remain within `matchEngine.ts` to preserve simulation reproducibility.
* **Mutations:** Zero lineup mutations are performed in the helper files (all array sorting uses spread-copy constructs).
* **Mark Lifecycles:** Stamina drains and status marks (e.g., `Tilted`, `Exposed`) remain entirely managed within the main tick.
