# Current Match Engine State

Welcome to the Match Engine documentation directory. This is the single source of truth for the match gameplay, simulation, balancing, and state rules of the Dream Team game.

---

## Document Index

* **[[01 Match Gameplay Architecture]]**: UI layouts, responsive scaling scale factors (black side bars fix), premium animations, and viewport containment.
* **[[02 Match Simulation Balance]]**: Smart Fatigue (stamina reweighting), possession timing calibration, crowd energy/rally rebalances, 3PT additive bonus caps, and the frontend-equivalent balance harness (`sim_accurate_mock.ts`).
* **[[03 Marks And Stamina]]**: Marks definition (Exposed, Hooked, Pinned, Static, Tilted; Debt is deprecated), same-mark immunity, mark decay, stamina drain scaling, and action stamina costs.
* **[[04 Skill Trigger Pipeline]]**: Complete Engine trigger rate boosts, `rollBaseSkill()`, and mechanic-aware `rollSpecialMechanic()` pipelines.
* **[[../player-card-upgrade/SkillAudit-Final-1 Base And Legacy Skill Status Lock]]**: Complete audit and status lock mapping of all 22 Base Skills and 15 legacy Special Skills.

---

## Core Code Files

### Primary Entry Wrapper & Orchestrator
* [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) — Compatibility entry point delegation wrapper. **~73 lines.**
* [matchTick.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/matchTick.ts) — Main possession simulator, state loops, fouls, clock, substitutions, and skill triggers orchestrator. **~1,650 lines.**
* [shotEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/shotEngine.ts) — Shot zone modifiers, shot clock calculations, and the Smart Fatigue reweighting algorithm.
* [matchTypes.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchTypes.ts) — Global match state interface, event definitions, and effective attribute calculations.
* [matchNarrative.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchNarrative.ts) — Play-by-play commentary generators.
* [matchAI.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchAI.ts) — AI coach decision evaluator.
* [playerIdentity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/playerIdentity.ts) — Attribute scaling fallbacks and tendency wrappers.

### Extracted Match Modules (src/lib/match/engine/ and src/lib/match/)
The monolithic `matchEngine.ts` has been fully decomposed into dedicated files:

| File | Refactor/Phase | Status | Contents |
|---|---|---|---|
| [matchTick.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/matchTick.ts) | Batch E | Done | Main tick loop orchestrator |
| [foulResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/foulResolver.ts) | Batch D | Done | Free throw execution and foul committer selectors |
| [reboundResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/reboundResolver.ts) | Batch D | Done | Board awards, rebounder selection, and putback intent gating |
| [shotPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/shotPossessionResolver.ts) | Batch D | Done | Shot selection, contest scales, and block/contest rolls |
| [userPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/userPossessionResolver.ts) | Batch C | Done | User offensive team possession play resolver |
| [aiPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/aiPossessionResolver.ts) | Batch C | Done | AI offensive team possession play resolver |
| [skillHooks.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/skillHooks.ts) | Batch B | Done | Special skill execution rolls (Anchor, Bench Captain, Timeout, etc.) |
| [eventLogBuilder.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/eventLogBuilder.ts) | Batch A | Done | Dynamic match event builder and skill logging |
| [markLifecycle.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/markLifecycle.ts) | Batch A | Done | Mark decay and clear checks |
| [staminaMutations.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/staminaMutations.ts) | Batch A | Done | Stamina consumption, recovery, and drain wrappers |
| [playerStatMutations.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/playerStatMutations.ts) | Batch A | Done | Stats tracking updates (PTS, AST, STL, REB, OREB, etc.) |
| [momentumFormResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/momentumFormResolver.ts) | Batch A | Done | Player momentum form adjustments and streak trackings |
| [possessionContext.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/possessionContext.ts) | Batch C | Done | Shared structures for play resolvers |

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
| `test_match_realism_calibration.ts` | Match Realism Calibration, baseline scores, IQ/Hustle impact, and symmetry |
| `test_match_skill_event_ui_final_qa.ts` | Match skill event wording, clean prefixes, and active mark descriptions |
| `test_court_vision_mechanic_ownership.ts` | Court Vision rhythm-only ownership, Hooked belongs to Lock Chain only, Debt is deprecated |
| `test_full_skill_ownership_sweep.ts` | All 15 family mark ownership, drain ownership, legacy X branches, toxic drain values, approved Tilted sources |
| `test_lock_chain_drain_ownership.ts` | Lock Chain drain after steal only, no turnover drain, no shot drain, no Hooked bleed, correct values, anti-snowball |
| *(more -- see `src/scripts/validation/` for full list)* | |

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

None. All 15 planned learned special skill families and mechanics are now fully implemented, integrated, and verified.

---

## Mark Ownership Rules

| Mark | Owner | Source |
|---|---|---|
| Hooked | LOCK_CHAIN_HOOKED | Lock Chain only (userPossessionResolver.ts, aiPossessionResolver.ts) |
| Exposed | DEEP_STRIKE | Deep Strike only |
| Pinned | DEFENSIVE_ANCHOR | Defensive Anchor only |
| Static | GAMEPLAN_JAMMER | Gameplan Jammer only |
| Tilted | FLOP | Flop only |
| Debt | (deprecated) | Not applied by any active skill |

**Court Vision Engine** operates exclusively as a rhythm/assist mechanic:
- Passing rhythm event messages
- Bounded shot quality bonuses in possession resolvers
- Maps to COURT_VISION_RHYTHM_BOOST only
- No mark application (no Debt, no Hooked)
- No stamina drain
- Phase CourtVisionMechanicOwnershipAudit removed legacy Hooked applications from shotPossessionResolver.ts

---

## Decomposition Verification & Results

* **Old Line Count (matchEngine.ts)**: ~3,682 lines
* **New Line Count**:
  * `matchEngine.ts` wrapper: 73 lines
  * `matchTick.ts` orchestrator: 1,655 lines
* **Final Module List**:
  * `matchTick.ts` (orchestration)
  * `possessionContext.ts` (shared structures)
  * `possessionHelpers.ts` (possession logic helpers)
  * `userPossessionResolver.ts` (User offense resolution)
  * `aiPossessionResolver.ts` (AI offense resolution)
  * `shotPossessionResolver.ts` (shot attempts/contests)
  * `foulResolver.ts` (free throws and fouls)
  * `reboundResolver.ts` (rebounds and putbacks)
  * `skillHooks.ts` (special skill rolls)
  * `eventLogBuilder.ts` (event logging)
  * `markLifecycle.ts` (mark decay)
  * `staminaMutations.ts` (stamina changes)
  * `playerStatMutations.ts` (stats updates)
  * `momentumFormResolver.ts` (momentum form adjustments)
* **Snapshot Parity**: 100% exact match verified via `test_match_engine_snapshot_baseline.ts --verify`.
* **Match Realism**: Passed successfully via `test_match_realism_calibration.ts`.
* **TypeScript Compilation**: Clean compilation (`npx tsc --noEmit` runs with zero errors).
* **Validation Suite**: All 45 validation tests pass successfully.
