# Current Match Engine State

Welcome to the Match Engine documentation directory. This is the single source of truth for the match gameplay, simulation, balancing, and state rules of the Dream Team game.

---

## Document Index

* **[[01 Match Gameplay Architecture]]**: UI layouts, responsive scaling scale factors (black side bars fix), premium animations, and viewport containment.
* **[[02 Match Simulation Balance]]**: Smart Fatigue (stamina reweighting), possession timing calibration, crowd energy/rally rebalances, 3PT additive bonus caps, and the frontend-equivalent balance harness (`sim_accurate_mock.ts`).
* **[[03 Marks And Stamina]]**: Marks definition (Exposed, Debt, Hooked, Pinned, Static, Tilted), same-mark immunity, mark decay, stamina drain scaling, and action stamina costs.
* **[[04 Skill Trigger Pipeline]]**: Complete Engine trigger rate boosts, `rollBaseSkill()`, and mechanic-aware `rollSpecialMechanic()` pipelines.

---

## Core Code Files

### Primary Engine (monolithic — under modularization)
* [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) — Main possession simulator, state loops, fouls, clock, substitutions, and skill triggers. **~3,870 lines. Active refactor target.**
* [shotEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/shotEngine.ts) — Shot zone modifiers, shot clock calculations, and the Smart Fatigue reweighting algorithm.
* [matchTypes.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchTypes.ts) — Global match state interface, event definitions, and effective attribute calculations.
* [matchNarrative.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchNarrative.ts) — Play-by-play commentary generators.
* [matchAI.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchAI.ts) — AI coach decision evaluator.
* [playerIdentity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/playerIdentity.ts) — Attribute scaling fallbacks and tendency wrappers.

### Extracted Match Modules (src/lib/match/)
These were extracted from matchEngine.ts via Refactor-1A through 1D. They are pure helpers with no RNG and no state mutations.

| File | Refactor Phase | Status | Contents |
|---|---|---|---|
| [matchTypes.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/matchTypes.ts) *(re-export shim)* | 1B | ✅ Done | Types and pure helpers re-exported from `utils/matchTypes.ts` |
| [staminaConfig.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/staminaConfig.ts) | 1B | ✅ Done | `STAMINA_CONFIG` constant — all stamina tuning values |
| [matchHelpers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/matchHelpers.ts) | 1B | ✅ Done | Pure helpers: `getCounterModifier`, `getSubtleStrategyHint`, `getIndividualThreePointShotMod`, `getFlopFoulPressureBonus`, `getGlassStrikeOrebBoost`, `getGlassStrikePutbackBoost`, `getStaminaCostScale` |
| [mockTeams.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/mockTeams.ts) | 1B | ✅ Done | `aiPlayer`, `withAssignedSkills`, `buildAiTeam`, `mockAiTeams` |
| [injuryHelpers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/injuryHelpers.ts) | 1C | ✅ Done | `generatePreMatchInjuries`, `calibrateLineupForInjuries` |
| [staminaDecay.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/staminaDecay.ts) | 1D | ✅ Done (`1f68541`) | `calculateBenchRecoveryAmount`, `driftFormTowardNeutral`, `calculateBaseStaminaDecay` |
| [reboundSystem.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/reboundSystem.ts) | 1E | ⚠️ PARTIAL Done (`a4bae97`) | `REB_W`, `getPositionReboundWeight`, `calculateTeamReboundScore`, `calculateOffensiveReboundChance`, `calculateGlassScale`, `calculateBarrierScale`. **pickRebounder + awardReb + all OREB/DREB/putback branches stay in matchEngine.** |
| `staminaSystem.ts` | Future | ❌ Not started | Full stamina action costs, skill drains, recovery, anti-snowball |
| `markSystem.ts` | Future | ❌ Not started | Mark application, decay, cleanse lifecycle |
| `foulSystem.ts` | Future | ❌ Not started | Shooting fouls, free throw sequence, foul committer selection |
| `shotResolution.ts` | Future | ❌ Not started | Shot success, 2PT/3PT/paint resolution, block/contest |
| `specialSkillSystem.ts` | Future | ❌ Not started | rollSpecialMechanic integration hooks for all 15 families |
| `archetypeEffects.ts` | Future | ❌ Not started | Archetype-gated skill access, gating logic |
| `eventLogSystem.ts` | Future | ❌ Not started | skillLog, match events, play-by-play messages |

### Validation Scripts (src/scripts/validation/)
All regression scripts use `npx ts-node --project tsconfig.scripts.json`. Run before any refactor commit.

| Script | Coverage |
|---|---|
| `test_anti_meta_regression.ts` | Anti-Meta / Gameplan, Dead Air X, all base skills |
| `test_paint_bully_regression.ts` | Paint Bully, Contact Tax, Lung Burner |
| `test_rebound_regression.ts` | Glass Bully, GLASS_STRIKE |
| `test_shooting_regression.ts` | Deep Strike, 3PT shooting balance |
| `test_foul_draw_regression.ts` | Foul-Draw / Flop baseline |
| `test_playmaking_regression.ts` | Light Bulb / Playmaking, Court Vision, Bench Captain |
| `test_stamina_decay_helpers.ts` | staminaDecay.ts pure helper unit tests (17/17) |
| *(more — see `src/scripts/validation/` for full list)* | |

---

## simulateTick Invariants

These must never change without an explicit audit + full regression run:

* `simulateTick` logic is untouched since Refactor-1A.
* User possession block — untouched.
* AI possession block — untouched.
* RNG call order — untouched.
* All gameplay math — untouched.
* All scoring logic — untouched.

---

## Blocked / Intentionally Not Implemented

| Item | Status | Reason |
|---|---|---|
| `POSTER_SPARK` | ❌ BLOCKED | Contact Tax / Lung Burner already provide safe paint pressure |
| `GAMEPLAN_JAMMER` | ❌ BLOCKED | Anti-Meta base skills + Dead Air X already strong |
| Foul-Draw archetype scaling | ❌ BLOCKED | FTA baseline can already reach warning limits |
| New family rolling pool | ❌ BLOCKED | All 15 mechanics + UI + rates + regression must be complete first |
