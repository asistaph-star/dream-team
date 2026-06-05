# Next Work

Project Checkpoint - Read this before starting tomorrow's work.

All 15 learned special skill families are now fully active, rollable, mapped to mechanics, and integrated into the match engine.

---

## Overall Project Truth

| Area | Status |
|---|---|
| Lineup archetype system | Built and gameplay-connected |
| Archetype detection UI | Built |
| Regression test suite | Strong and active (39/39 passing) |
| First big balance pass | Complete |
| 22 Base Skills final-lock | Done (22/22 verified) |
| Base Skill real-data assignment | Done (deterministic & tested) |
| Base Skill star-up safety | Done (repaired on load) |
| 15 Learned Special Skill Families | Done, 15/15 active and rollable |
| Legacy X Skills | Migration-only and non-rollable |
| Player Attribute final-audit | Done |
| OVR protection / Star-up separation | Done |
| matchEngine architecture cleanup | In progress |

---

## matchEngine Refactor - Phase Status

Rule: Always run npx tsc --noEmit + full regression suite before committing any refactor phase.

| Phase | Status | Commit | What was done |
|---|---|---|---|
| Refactor-1A | Done | - | matchEngine audit/planning complete |
| Refactor-1B | Done | - | Pure types, constants, helpers, mock teams extracted |
| Refactor-1C | Done | - | Injury + roster calibration helpers extracted |
| Refactor-1D | Done | 1f68541 | Stamina decay pure formulas -> staminaDecay.ts |
| Refactor-1E | Done | a4bae97 | Rebound pure formula helpers -> reboundSystem.ts |
| Refactor-1F | Done | 809c862 | Foul/free throw pure formula helpers -> foulSystem.ts |
| Refactor-1G | Done | - | Event log audit complete. Extraction blocked due to RNG coupling. |
| Refactor-1H | Done | - | Mark system audit complete. Extraction blocked until mark tests built. |
| Refactor-1I | Done | 29145fa | Special skill hook audit complete. Extraction blocked to preserve RNG. |

---

## Extracted Match Modules

| File | Refactor/Phase | Status | Contents |
|---|---|---|---|
| matchTypes.ts (re-export shim) | 1B | Done | Types and pure helpers re-exported from utils/matchTypes.ts |
| staminaConfig.ts | 1B | Done | STAMINA_CONFIG constant - all stamina tuning values |
| matchHelpers.ts | 1B | Done | Pure helpers: getCounterModifier, getSubtleStrategyHint, getIndividualThreePointShotMod, getFlopFoulPressureBonus, getGlassStrikeOrebBoost, getGlassStrikePutbackBoost, getStaminaCostScale |
| mockTeams.ts | 1B | Done | aiPlayer, withAssignedSkills, buildAiTeam, mockAiTeams |
| injuryHelpers.ts | 1C | Done | generatePreMatchInjuries, calibrateLineupForInjuries |
| staminaDecay.ts | 1D | Done | calculateBenchRecoveryAmount, driftFormTowardNeutral, calculateBaseStaminaDecay |
| reboundSystem.ts | 1E | Partial | REB_W, getPositionReboundWeight, calculateTeamReboundScore, calculateOffensiveReboundChance, calculateGlassScale, calculateBarrierScale |
| foulSystem.ts | 1F | Partial | FOUL_W, getPositionFoulWeight, getFoulStaminaModifier, getClutchRatingByRarity, calculateCrowdNoisePenalty, calculateFreeThrowChance, calculateBaseShootingFoulChance, calculateFourPointBaitBoost |
| brokenPlayRescue.ts | BrokenPlayRescue | Done | getBrokenPlayRescueIdentity, calculateBrokenPlayRescueChanceScale, calculateBrokenPlayRescueStaminaCost, calculateBrokenPlayRescueShotPenalty |

---

## Gameplay Systems - Status

### Lineup Archetypes
- Stamina Drain: Connected and stable.
- Foul-Draw / Flop: Baseline active, counters active.
- Glass Bully / Rebound: Connected with GLASS_STRIKE.
- Light Bulb / Playmaking: Connected with COURT_VISION + BENCH_CAPTAIN.
- Deep Strike / Shooting: Connected with DEEP_STRIKE.
- Paint Bully: Connected with POSTER_SPARK.
- Anti-Meta / Gameplan: Connected with GAMEPLAN_JAMMER.

### Base Skills (22 total)
All 22 base skills are active, tested, and officially final-locked.
Arc Pressure, Paint Magnet, Power Driver, Mismatch Caller, Glass Touch, Foul Magnet, Tempo Surgeon, Rim Warden, Hands Active, Screen Breaker, Shadow Guard, Discipline Wall, Paint Barrier, Focus Lock, Complete Engine, Iron Motor, Connector Hub, Tempo Switch, Position Flex, Future Core, Share Rhythm, Enforcer Lift.

### Legacy Special Skills (15 total)
All 15 legacy X skills are fully retired from the rolling pool and marked as migration-only. Roster normalization on load maps them directly to the corresponding official Special Skill Family IDs:
- Red Dot X & Four-Point Bait X -> DEEP_STRIKE
- Chain Pass X -> COURT_VISION_ENGINE
- Contact Tax X & Lung Burner X -> POSTER_SPARK
- Flop X -> FLOP
- Cage Step X -> LOCK_CHAIN
- Corner Trap X & Five-Man Squeeze X -> DEFENSIVE_ANCHOR
- Clean Contest X -> CLEAN_CHALLENGE
- Composure X -> COMPOSURE_SHIELD
- Cold Timeout X -> TIMEOUT_RESET
- Dead Air X & Debt Collector X -> GAMEPLAN_JAMMER
- Pressure Coach X -> BENCH_CAPTAIN

---

## Next Starting Phase
**Phase UpgradeSystemFinalLock** - Final verification of card upgrade success rates, failure metrics, duplicate requirement matrices, and safety under save/load constraints.

### Goal
Ensure that the duplicate consumption matrix is balanced, that upgrade failure consumes only materials while keeping duplicates safe, that correct duplicate prioritization is enforced, and that the upgrade pipeline handles save/load states cleanly.

### Future Phase
**Phase NBADataPipelineFinalLock** - Syncing/source stability checks and verification of real rosters season transition.
