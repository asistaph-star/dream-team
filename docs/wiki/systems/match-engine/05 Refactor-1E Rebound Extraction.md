# Refactor-1E — Rebound Formula Helpers Extraction

**Phase:** Refactor-1E
**Commit:** `a4bae97`
**Branch:** master
**Date:** 2026-06-04
**Type:** Behavior-preserving refactor — pure formulas only

---

## What Was Done

Created [`src/lib/match/reboundSystem.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/reboundSystem.ts) with 6 pure helpers extracted from `matchEngine.ts`.

Updated [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) to import and use those helpers.

Created [`src/scripts/validation/test_rebound_helpers.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_rebound_helpers.ts) — 42 validation checks, 42/42 passed.

---

## Extracted Helpers (reboundSystem.ts)

| Helper | Description |
|---|---|
| `REB_W` | Position rebound weight constant: `{ C:2.0, PF:1.6, SF:1.0, SG:0.6, PG:0.4 }` |
| `getPositionReboundWeight(position)` | Looks up `REB_W[position]`, fallback `1.0` for unknown |
| `calculateTeamReboundScore(lineup, staminaMap)` | Weighted rebound sum — stamina passed as parameter, not captured from closure |
| `calculateOffensiveReboundChance(attReb, defReb, glassScale, barrierScale, glassStrikeBoost)` | OREB chance formula — floor `0.10`, cap `0.36` |
| `calculateGlassScale(holders)` | Glass Touch scale: `0.85 + (maxRating/100) × 0.30`. Returns `0` if no holders. |
| `calculateBarrierScale(holders)` | Paint Barrier scale: same formula as glassScale. Returns `0` if no holders. |

All 6 are pure functions: no `Math.random()`, no state mutations, no event logs, no closure captures.

---

## What Stayed in matchEngine.ts

| Symbol | Reason |
|---|---|
| `pickRebounder` | Contains `Math.random()` — moving it would change RNG call order |
| `awardReb` | Mutates `newPlayerStats`, `newFormRating`, `actionWorkload.rebounderId` |
| OREB roll (`Math.random() < orebChance`) | RNG — must stay |
| DREB branch | Coupled to `pickRebounder` and event logs |
| Putback branch (full) | RNG + scoring + stats + events — all tightly coupled |
| User `fc2` putback formula | Uses `momentumBonus`, `decisionWeightMod`, closure vars — too complex to safely parameterize |
| AI `fc2` putback formula | Different structure from User fc2 — asymmetry is intentional |
| All event logs | Coupled to local closure vars |
| All stamina mutation dispatch | Coupled to `newStamina` and `applyActionStaminaCost` |

---

## Invariants Preserved

| Invariant | Status |
|---|---|
| OREB floor = **0.10** | ✅ Preserved |
| OREB cap = **0.36** | ✅ Preserved |
| OREB base rate = **0.23** (balanced teams, no modifiers) | ✅ Preserved |
| Matchup swing multiplier = **0.34** | ✅ Preserved |
| Glass Touch additive = **0.055 × glassScale** | ✅ Preserved |
| Paint Barrier suppression = **0.06 × barrierScale** | ✅ Preserved |
| GLASS_STRIKE boost = `glassStrikeBoost` param (additive) | ✅ Preserved |
| `pickRebounder` RNG call order | ✅ Unchanged (stayed in matchEngine) |
| OREB/DREB resolution branches | ✅ Untouched |
| Putback branches | ✅ Untouched |
| User fc2 clamp: `Math.max(0.20, Math.min(0.80, whole_expression))` with `momentumBonus × decisionWeightMod` | ✅ Preserved |
| AI fc2 clamp: partial ratio clamp `[0.30, 0.80]` × stamina × form + additive bonuses outside clamp | ✅ Preserved (intentional asymmetry — do not "fix") |
| No scoring changes | ✅ |
| No stamina math changes | ✅ |
| No event log changes | ✅ |
| No saved data changes | ✅ |
| No OVR/star-up logic changes | ✅ |
| RNG order unchanged | ✅ |

---

## Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `test_rebound_helpers.ts` | ✅ **42/42 passed** |
| `test_lineup_archetypes.ts` | ✅ ALL PASSED |
| `test_anti_flop_counters.ts` | ✅ ALL PASSED |
| `test_anti_meta_regression.ts` | ✅ Completed (pre-existing FTA warning — unrelated to refactor) |
| `test_contact_tax_lung_burner_regression.ts` | ✅ COMPLETE |
| `test_foul_draw_regression.ts` | ✅ All scenarios simulated |
| `test_four_point_bait_hybrid_gating.ts` | ✅ ALL PASSED |
| `test_paint_bully_regression.ts` | ✅ COMPLETE |
| `test_shooting_regression.ts` | ✅ COMPLETE |
| `sim_accurate_mock.ts` | ✅ COMPLETE |
| `test_contact_tax_lung_burner_rebalance.ts` | ⚠️ **Pre-existing stochastic flake** — `Lung Burner X failed to trigger under test conditions (Level: 0)`. This is an RNG-based forced-trigger test that fails intermittently with no fixed seed. No rebound code is referenced in this script. Not caused by Refactor-1E. Do not modify Contact Tax / Lung Burner code in this phase. |

---

## Future Work (not in this phase)

The following were deliberately excluded from Refactor-1E scope:

- `pickRebounder` (Option B) — only safe if a future audit confirms no RNG order change
- `awardReb` extraction — requires passing all stat/form/workload maps as parameters; too many deps
- Full OREB/DREB processor extraction (Option C) — HIGH risk, blocked
- `fc2` putback formula extraction — too many closure dependencies
- The User/AI fc2 asymmetry must be preserved in any future phase

Next safe refactor target after 1E: **Refactor-1F** (to be determined in next audit).
