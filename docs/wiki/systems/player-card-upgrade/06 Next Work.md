# Next Work

## Current Status

### Gameplay Systems — Locked Stable
- **Base Skills**: ✅ Locked stable (22 base skills)
- **Upgrade System**: ✅ Locked stable
- **Skill Tape Economy**: ✅ Locked stable
- **Learned Skill Identity Scaling**: ✅ Locked stable
- **MatchEngine Mechanic Migration**: ✅ Locked stable
- **New Family Rolling Pool**: ❌ Not active yet — activation prerequisites not met

### Lineup Archetypes — Gameplay Status
| Archetype | Status | Notes |
|---|---|---|
| Stamina Drain | ✅ Connected and stable | — |
| Foul-Draw / Flop | ⚠️ PARTIAL | Baseline active, counters active. **Archetype scaling blocked** |
| Glass Bully / Rebound | ✅ Connected | `GLASS_STRIKE` active |
| Light Bulb / Playmaking | ✅ Connected | `COURT_VISION` + `BENCH_CAPTAIN` gating |
| Deep Strike / Shooting | ✅ Connected | `Red Dot` + `Four-Point Bait` hybrid gating, shooting foul symmetry |
| Paint Bully | ✅ Baseline tested | `Contact Tax X` / `Lung Burner X` rebalanced. `POSTER_SPARK` blocked |
| Anti-Meta / Gameplan | ✅ Baseline active | `Dead Air X` / `GAMEPLAN_DEAD_AIR` active. `GAMEPLAN_JAMMER` blocked |

---

## matchEngine Refactor — Phase Status

> **Rule**: Do not commit refactor phases without running `npx tsc --noEmit` and the full regression suite.

| Phase | Status | What was done |
|---|---|---|
| Refactor-1A | ✅ DONE | matchEngine audit/planning complete |
| Refactor-1B | ✅ DONE | Pure types, constants, helpers, mock teams extracted |
| Refactor-1C | ✅ DONE | Injury + roster calibration helpers extracted |
| Refactor-1D | ✅ DONE | Stamina decay pure formulas extracted to `staminaDecay.ts` |
| Refactor-1E | 🔍 IN AUDIT | Rebound & putback extraction audit (code only, not yet extracted) |

### Refactor — What is NOT done yet

#### 1. Stamina System — PARTIAL
**Done:**
- `staminaConfig.ts` — constants only
- `staminaDecay.ts` — `calculateBenchRecoveryAmount`, `driftFormTowardNeutral`, `calculateBaseStaminaDecay`

**Not done (still in `matchEngine.ts`):**
- Action stamina costs processor
- Skill stamina drain helpers (Contact Tax, Lung Burner runtime)
- Recovery skill interactions (Bench Captain, Enforcer Lift, Timeout Reset)
- Anti-snowball helpers
- Full `staminaSystem.ts` module

#### 2. Mark System — NOT EXTRACTED
**Not done:**
- `markSystem.ts` does not exist
- Mark application logic (Exposed, Tilted, Debt, Hooked, Pinned, Static)
- Mark duration decay
- Mark cleanse (Timeout Reset cleanse, Composure/Clean resistance)
- Mark lifecycle snapshot tests

#### 3. Foul System — NOT EXTRACTED
**Not done:**
- `foulSystem.ts` does not exist
- Shooting foul logic
- Flop X / SGA special foul behavior
- Four-Point Bait hybrid foul boost
- Foul Magnet / Clean Challenge / Composure / Discipline Wall counters
- And-one logic, foul caps, foul committer selection
- Free throw sequence
- Foul-out logic

#### 4. Rebound System — NOT EXTRACTED
**Not done:**
- `reboundSystem.ts` does not exist
- OREB/DREB resolution logic
- Rebounder selection (`pickRebounder` — contains RNG, must stay until safe)
- Team rebound score, offensive rebound chance formulas
- Paint Barrier suppression, GLASS_STRIKE boost
- Putback branch, second-chance points
- Non-recursive missed putback handling

**Safe to extract next (Refactor-1E pure formulas only):**
- `REB_W` constant
- `getOffensiveReboundChance`
- `calculateGlassScale` / `calculateBarrierScale`
- `calculateTeamReboundScore`
- `getPositionReboundWeight`

#### 5. Shot Resolution — NOT EXTRACTED
**Not done:**
- `shotResolution.ts` does not exist
- Shot success calculation, 2PT/3PT/paint resolution
- Block interaction, defender contest
- Stamina/form effect on shots
- Arc Pressure, Court Vision rhythm, SKY_WALL contest
- Scoring update logic

#### 6. Special Skill System — NOT EXTRACTED
**Not done:**
- `specialSkillSystem.ts` does not exist
- `rollSpecialMechanic` integration hooks
- Dead Air X, Defensive Anchor, Lock Chain, Sky Wall, Glass Strike
- Court Vision, Bench Captain, Contact Tax, Lung Burner, Flop, Four-Point Bait
- Composure / Clean Challenge hooks
- All User/AI mirrored skill trigger hooks

#### 7. Archetype Effects — NOT EXTRACTED
**Not done:**
- `archetypeEffects.ts` does not exist
- Archetype-gated skill access still inline in `matchEngine.ts`
- Foul-Draw scaling blocked
- Anti-Meta / GAMEPLAN_JAMMER blocked
- POSTER_SPARK blocked

#### 8. Event Log System — NOT EXTRACTED
**Not done:**
- `eventLogSystem.ts` does not exist
- `skillLog`, match events, play-by-play messages still in `matchEngine.ts`

---

## Intentionally Blocked Systems

| System | Status | Reason |
|---|---|---|
| `POSTER_SPARK` | ❌ BLOCKED | Contact Tax / Lung Burner already cover safe paint pressure. Audited and intentionally not implemented. |
| `GAMEPLAN_JAMMER` | ❌ BLOCKED | Anti-Meta base + Dead Air X already strong. More suppression risks scoring collapse. |
| Foul-Draw archetype scaling | ❌ BLOCKED | FTA baseline can already reach warning levels. |
| New family rolling pool | ❌ BLOCKED | All 15 mechanics must exist, be described, rated, UI-ready, and pass regression before activation. |

---

## Skill Audit Still Needed

### 1. Full 22 Base Skills Final Lock — NOT DONE
Need a final audit table for every base skill:
- Skill name, category, description, real matchEngine effect
- Identity helper, trigger condition, balance risk
- Test coverage, documentation accuracy
- Status: DONE / PARTIAL / NEEDS CLEANUP / BLOCKED

### 2. Full 15 Legacy Special Skills Final Lock — NOT DONE
Need a final status for each legacy skill:

| Skill | Known Status |
|---|---|
| Red Dot X | Active, Shooting gated |
| Four-Point Bait X | Active, hybrid gated |
| Contact Tax X | Active, safely rebalanced |
| Lung Burner X | Active, safely rebalanced |
| Flop X | Active baseline, counters active, archetype scaling blocked |
| Composure X | Active as counter |
| Clean Contest X | Active as counter |
| Dead Air X | Active and strong |
| Cage Step X | Legacy preserved |
| Corner Trap X | Legacy preserved |
| Five-Man Squeeze X | Legacy preserved |
| Pressure Coach X | Legacy preserved |
| Chain Pass X | Legacy preserved |
| Cold Timeout X / Timeout Reset | Active / preserved |
| Debt Collector X | Needs final specific audit lock |

---

## Next Immediate Work

1. **Refactor-1E — Rebound & Putback Pure Formula Extraction**
   - Audit complete. Awaiting approval.
   - Extract 6 pure helpers into `reboundSystem.ts` (Option A only).
   - Do NOT move `pickRebounder` or `awardReb` yet.

2. **Phase SkillAudit-Final-1 — Full 22 Base Skills + 15 Special Skills Status Lock**
   - After refactor audit phases complete.
   - Create the final truth table.
   - Clearly mark each skill: DONE / PARTIAL / BLOCKED / FUTURE.

3. **Do not start new buffs or archetype mechanics yet.**

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
- **Batch safe/non-risky work together** (documentation, naming, type helpers, UI copy, icon mapping audits).
- **Isolate risky work** (matchEngine changes, stamina/foul/mark logic, rolling pool activation, save data migration, OVR/star-up changes).
- Stop before risky gameplay/balance changes and wait for approval.
- Always run `npx tsc --noEmit` and regression suite before committing refactor phases.
