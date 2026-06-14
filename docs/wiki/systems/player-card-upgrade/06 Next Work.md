# Next Work

Project Checkpoint - Read this before starting tomorrow's work.

All 15 learned special skill families are now fully active, rollable, mapped to mechanics, and integrated into the match engine.

---

## Overall Project Truth

| Area | Status |
|---|---|
| Lineup archetype system | Built and gameplay-connected |
| Archetype detection UI | Built |
| Regression test suite | Strong and active (40/40 passing) |
| First big balance pass | Complete |
| 22 Base Skills final-lock | Done (22/22 verified) |
| Base Skill real-data assignment | Done (deterministic & tested) |
| Base Skill star-up safety | Done (repaired on load) |
| Upgrade System final-lock | Done (20 duplicates matrix locked) |
| Upgrade failure safety | Done (materials only, cards safe) |
| Upgrade success rate scaling | Done (100% to 5% Red ★5) |
| Star-up stat repair on load | Done (repaired via repairStarGrowth) |
| 15 Learned Special Skill Families | Done, 15/15 active and rollable |
| Legacy X Skills | Migration-only and non-rollable |
| Player Attribute final-audit | Done |
| OVR protection / Star-up separation | Done |
| Attribute Model Refinement (IQ & Hustle) | Done |
| Match Engine Wiring (IQ & Hustle Wiring) | Done |
| matchEngine architecture cleanup | Done |
| Match Realism Calibration | Done (realism verified) |
| SkillSystemHardReset-FinalLock | Done (15-family hard reset complete) |
| Storage duplicate final audit | Done (helpers + context execution path verified) |
| Skill UI / Storage UI Cleanup | Done (visual assets + badge mapping + exact storage verified) |
| PlayerStorageVisualQA | Done (visual QA, card badge layouts, skill badge color category, and warning formats polished) |
| SkillDescriptionFinalQA | Done (skill descriptions, tooltips, catalog text, category labels audited and cleaned) |
| MatchSkillEventUIFinalQA | Done (verified match screen wording, cleaned legacy prefixes, added mark descriptions to tooltip, ensured Court Vision Engine has rhythm-based wording) |
| CourtVisionMechanicOwnershipAudit | Done (removed legacy Hooked mark applications from Court Vision Engine in shotPossessionResolver.ts, Hooked belongs only to Lock Chain, Debt remains deprecated) |
| FullSkillOwnershipSweep | Done (all 15 families verified, zero violations, 20-check validation script added) |
| LockChainDrainOwnershipAudit | Done (removed single-target turnover drain and per-possession on-ball shot drain, Lock Chain drains only after successful steal) |
| SkillSystemCanonicalCloseout | Done (final canonical ownership table, banned mechanics list, corrected mechanic IDs and Tilted ownership) |
| UI-PlayerCardUpgradePolish | Done (Polished modal, fixed clipping on star-up preview, reorganized attribute panels) |
| ResponsiveAppLayoutSystem Batch A | Done (Game Viewport + Global BottomNav cover-fit viewport, layout safety overlays, and ResponsiveGameViewportSafeOverlay safe-area clamping/collapsing) |
| ResponsiveAppLayoutSystem Batch B | Planned (Player Storage, Inventory, Modal responsiveness) |
| Validation Suite Status | Done (all 51 tests passing) |

---

## matchEngine Refactor - Phase Status

The match engine decomposition has been fully completed and verified against baseline snapshots.

| Phase / Batch | Status | Commit | What was done |
|---|---|---|---|
| Batch A | Done | `0605221b6` | Extracted event log builder, mark lifecycle, stamina mutations, stats mutations, form resolvers |
| Batch B | Done | `58c271d2f` | Extracted special skill hooks |
| Batch C | Done | `refactor(match): extract shot foul rebound flows` | Extracted User and AI possession flows, turnover and auto sub resolvers |
| Batch D | Done | `refactor(match): extract shot foul rebound flows` | Extracted foul, rebound, and shot intent/contest resolvers |
| Batch E | Done | `refactor(match): shrink match engine wrapper` | Extracted top-level orchestrator (`matchTick.ts`), shunk `matchEngine.ts` wrapper |

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
| attributeGameplayEffects.ts | MatchEngineWiring | Done | Pure gameplay modifiers for basketballIQ and hustle attributes |

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
**Lobby and Match Gameplay Enhancements**

### Focus
* Review match engine comments and commentary systems.
* Integrate additional lobby profile visual details.
* Review draft and player market visuals.
