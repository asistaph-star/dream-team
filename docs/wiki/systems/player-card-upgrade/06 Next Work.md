# Next Work

> **Project Checkpoint — Read this before starting any new work.**
>
> The skill system is NOT fully finished. The first big balance pass is complete.
> Do not add new buffs, enable new rolling families, or implement blocked mechanics
> until Phase SkillAudit-Final-1 is done and the refactor safety work reaches a stable point.

---

## Overall Project Truth

| Area | Status |
|---|---|
| Lineup archetype system | ✅ Built and gameplay-connected |
| Archetype detection UI | ✅ Built |
| Regression test suite | ✅ Strong and active |
| First big balance pass | ✅ Complete |
| 22 Base Skills final-lock | ❌ NOT DONE — active but not audited one-by-one |
| 15 Legacy Skills final-lock | ❌ NOT DONE — not broken, but no official lock declared |
| New family rolling pool | ❌ BLOCKED — activation prerequisites not met |
| matchEngine architecture cleanup | 🔄 IN PROGRESS (Refactor-1B through 1E done) |
| Final skill audit (SkillAudit-Final-1) | ❌ NOT STARTED |

---

## matchEngine Refactor — Phase Status

> **Rule**: Always run `npx tsc --noEmit` + full regression suite before committing any refactor phase.

| Phase | Status | Commit | What was done |
|---|---|---|---|
| Refactor-1A | ✅ DONE | — | matchEngine audit/planning complete |
| Refactor-1B | ✅ DONE | — | Pure types, constants, helpers, mock teams extracted |
| Refactor-1C | ✅ DONE | — | Injury + roster calibration helpers extracted |
| Refactor-1D | ✅ DONE | `1f68541` | Stamina decay pure formulas → `staminaDecay.ts` |
| Refactor-1E | ✅ DONE | `a4bae97` | Rebound pure formula helpers → `reboundSystem.ts` (Option A only) |

### What Refactor-1E Extracted (pure formulas only)
- `REB_W` constant
- `getPositionReboundWeight`
- `calculateTeamReboundScore` (staminaMap as param, no closure capture)
- `calculateOffensiveReboundChance` (OREB floor 0.10 / cap 0.36 preserved)
- `calculateGlassScale`
- `calculateBarrierScale`

### What Refactor-1E Did NOT Move (stays in matchEngine)
- `pickRebounder` — contains `Math.random()`
- `awardReb` — mutates stats/form/actionWorkload
- OREB/DREB/putback resolution branches
- fc2 putback formula and all RNG rolls
- User/AI asymmetry — intentionally preserved

---

## Unfinished Refactor Modules (all still inside matchEngine.ts)

### 1. Stamina System — PARTIAL
**Done:** `staminaConfig.ts`, `staminaDecay.ts` (pure formula helpers only)
**Not done:** Action stamina costs, skill drain interactions, recovery skills, anti-snowball, `staminaSystem.ts`

### 2. Mark System — NOT STARTED
`markSystem.ts` does not exist. All mark logic (Exposed, Tilted, Debt, Hooked, Pinned, Static), mark decay, cleanse, and resistance remain in `matchEngine.ts`.

### 3. Foul System — NOT STARTED
`foulSystem.ts` does not exist. Shooting fouls, Flop pressure, Four-Point Bait boost, foul committer selection, and-one, foul-out, free throw sequence all remain in `matchEngine.ts`.

### 4. Rebound System — PARTIAL (Option A done)
`reboundSystem.ts` created with 6 pure helpers.
**Still in matchEngine:** `pickRebounder`, `awardReb`, all OREB/DREB/putback branches, fc2 formula.

### 5. Shot Resolution — NOT STARTED
`shotResolution.ts` does not exist. Shot success, 2PT/3PT/paint resolution, block/contest, Arc Pressure, SKY_WALL all remain in `matchEngine.ts`.

### 6. Special Skill System — NOT STARTED
`specialSkillSystem.ts` does not exist. All `rollSpecialMechanic` hooks for all 15 families remain in `matchEngine.ts`.

### 7. Archetype Effects — NOT STARTED
`archetypeEffects.ts` does not exist. All archetype-gated skill access remains inline in `matchEngine.ts`.

### 8. Event Log System — NOT STARTED
`eventLogSystem.ts` does not exist. `skillLog`, `makeEvent`, and all message strings remain in `matchEngine.ts`.

---

## Gameplay Systems — Status

### Lineup Archetypes
| Archetype | Status | Notes |
|---|---|---|
| Stamina Drain | ✅ Connected and stable | — |
| Foul-Draw / Flop | ⚠️ PARTIAL | Baseline active, counters active. **Archetype scaling blocked** |
| Glass Bully / Rebound | ✅ Connected | GLASS_STRIKE active |
| Light Bulb / Playmaking | ✅ Connected | COURT_VISION + BENCH_CAPTAIN gating |
| Deep Strike / Shooting | ✅ Connected | Red Dot + Four-Point Bait hybrid gating |
| Paint Bully | ✅ Baseline tested | Contact Tax / Lung Burner rebalanced. POSTER_SPARK blocked |
| Anti-Meta / Gameplan | ✅ Baseline active | Dead Air X active. GAMEPLAN_JAMMER blocked |

### Base Skills (22 total)
**Active and tested through archetype audits:**
Arc Pressure, Shadow Guard, Focus Lock, Discipline Wall, Hands Active, Tempo Switch,
Enforcer Lift, Future Core, Power Driver, Paint Magnet, Mismatch Caller, Glass Touch,
Rim Warden, Iron Motor, Share Rhythm, Position Flex.

> ⚠️ Not officially final-locked. Phase SkillAudit-Final-1 required.

### Legacy Special Skills (15 total)
| Skill | Status |
|---|---|
| Red Dot X | ✅ Active, Shooting gated |
| Four-Point Bait X | ✅ Active, hybrid gated |
| Contact Tax X | ✅ Active, safely rebalanced |
| Lung Burner X | ✅ Active, safely rebalanced |
| Flop X | ⚠️ Baseline only, counters active, scaling blocked |
| Composure X | ✅ Active as counter |
| Clean Contest X | ✅ Active as counter |
| Dead Air X | ✅ Active and strong |
| Cage Step X | 📦 Legacy preserved |
| Corner Trap X | 📦 Legacy preserved |
| Five-Man Squeeze X | 📦 Legacy preserved |
| Pressure Coach X | 📦 Legacy preserved |
| Chain Pass X | 📦 Legacy preserved |
| Cold Timeout X / Timeout Reset | ✅ Active / preserved |
| Debt Collector X | ⚠️ Needs final specific audit lock |

> ⚠️ Not officially final-locked. Phase SkillAudit-Final-1 required.

---

## Intentionally Blocked Systems

| System | Status | Reason |
|---|---|---|
| POSTER_SPARK | ❌ BLOCKED | Contact Tax / Lung Burner already provide safe paint pressure |
| GAMEPLAN_JAMMER | ❌ BLOCKED | Anti-Meta base skills + Dead Air X already strong |
| Foul-Draw archetype scaling | ❌ BLOCKED | FTA baseline can already reach warning limits |
| New family rolling pool | ❌ BLOCKED | All 15 mechanics + UI + rates + regression must pass first |

---

## Next Immediate Work

### Priority 1 — Continue safe matchEngine refactor phases
Continue Refactor-1F and beyond. Audit first, extract only pure formulas, run full regression before committing.

### Priority 2 — Phase SkillAudit-Final-1
When refactor work reaches a stable point, run the full 22 Base Skills + 15 Special Skills audit lock.
This creates the final truth table with a status per skill:
- ✅ Finished and locked
- ⚠️ Active but needs doc cleanup
- 📦 Legacy preserved
- ❌ Blocked intentionally
- 🔍 Needs regression
- 🔮 Needs future redesign

### Priority 3 — No new buffs until audit complete
Do not start new skill mechanics, new archetype buffs, or new family rolling until SkillAudit-Final-1 is signed off.

---

## Activation Prerequisites (Rolling Pool)
The new 15-family rolling pool will **not** be activated until:
1. All 15 native mechanics exist in the match engine.
2. `SPECIAL_SKILL_TEXT` has descriptions for all 15.
3. `SPECIAL_SKILL_RATES` has base rates for all 15.
4. UI/icons can handle all 15 (no broken images or missing text).
5. Reroll/duplicate prevention passes with new IDs.
6. Full balance regression passes (30+ matches).

---

## Workflow Rules
- Audit first. Extract one safe piece. Run TypeScript. Run regression. Commit. Update docs.
- Batch safe/non-risky work together. Isolate risky work.
- Stop before any risky gameplay/balance change and wait for approval.
- Always run `npx tsc --noEmit` and regression suite before committing refactor phases.
