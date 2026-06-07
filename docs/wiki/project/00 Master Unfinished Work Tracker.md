# Master Unfinished Work Tracker

This document provides a comprehensive verification log and completion tracker for all past planned work and systems in the project. Every claim is backed by direct code references and file evidence.

---

## Section 1: Fully Done and Verified

### 1. Unified Special Skill Migration System
* **Status**: DONE
* **Evidence File Paths**:
  * [skillMigration.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillMigration.ts) (normalizeSpecialSkillId, migratePlayerSpecialSkills)
  * [GameStateContext.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/context/GameStateContext.tsx#L119-L146) (normalizeRoster calls migratePlayerSpecialSkills on mount and update)
* **What Code Does**: Automatically maps legacy X-suffix skill strings to their corresponding family IDs and updates the roster state.
* **Tests**: [test_skill_architecture_layers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_architecture_layers.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 2. Lineup Archetype Gating and Resolution
* **Status**: DONE
* **Evidence File Paths**:
  * [archetypes.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/lineup/archetypes.ts) (ARCHETYPE_DEFINITIONS)
  * [lineupArchetypeResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/lineup/lineupArchetypeResolver.ts) (resolveLineupArchetypes)
* **What Code Does**: Evaluates active starting 5 base skills to determine signal counts and contributors for 7 different archetype categories.
* **Tests**: [test_lineup_archetypes.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_lineup_archetypes.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 3. Rebalance of Five-Man Squeeze and Debt Collector
* **Status**: DONE
* **Evidence File Paths**:
  * [staminaSkillEffects.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/staminaSkillEffects.ts#L1-L47) (FIVE_MAN_SQUEEZE_BASE = 25, FIVE_MAN_SQUEEZE_BOOSTED = 40, applyAntiSnowballScaling)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts#L456-L472) (applyFiveManSqueeze calls applyAntiSnowballScaling)
* **What Code Does**: Rebalanced Five-Man Squeeze down from 40/60 to 25/40 team-wide and added anti-snowball scaling factors.
* **Tests**: [test_stamina_risk_regression.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_stamina_risk_regression.ts) and [test_stamina_skill_effect_helpers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_stamina_skill_effect_helpers.ts) pass.
* **Risk Level**: MEDIUM
* **Recommended Next Step**: Continue monitoring team fatigue in Q4.

### 4. Momentum Swing Learned Special Skill Family
* **Status**: DONE
* **Evidence File Paths**:
  * [momentumSwing.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/momentumSwing.ts) (getMomentumSwingIdentity, calculateMomentumSwingRecovery, shouldMomentumSwingTrigger)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (applyMomentumSwing, momentumSwingBump)
  * [skillCatalog.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillCatalog.ts) (Registered in SPECIAL_SKILL_NAMES)
* **What Code Does**: Triggers after defensive momentum events to recover stamina for the lowest-stamina teammate, restore form, and apply a +3 momentum bump.
* **Tests**: [test_momentum_swing.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_momentum_swing.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 5. Broken Play Rescue Learned Special Skill Family
* **Status**: DONE
* **Evidence File Paths**:
  * [brokenPlayRescue.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/brokenPlayRescue.ts) (getBrokenPlayRescueIdentity, calculateBrokenPlayRescueChanceScale, calculateBrokenPlayRescueStaminaCost, calculateBrokenPlayRescueShotPenalty)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (intercepts User and AI turnovers, rolls skill mechanic, applies stamina cost, sets rescue shot flags)
  * [skillCatalog.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillCatalog.ts) (Registered in SPECIAL_SKILL_NAMES)
* **What Code Does**: Intercepts unforced and forced turnovers before they are finalized. If the committer has the `BROKEN_PLAY_RESCUE` skill and rolls successfully, it prevents the turnover, consumes stamina from the committer, and forces them to take a penalized, low-quality 2PT rescue shot.
* **Tests**: [test_broken_play_rescue.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_broken_play_rescue.ts) passes.
* **Risk Level**: MEDIUM
* **Recommended Next Step**: Monitor rescue frequency and scoring rates.

### 6. Player Tendencies Integration
* **Status**: DONE
* **Evidence File Paths**:
  * [playerIdentity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/playerIdentity.ts#L71-L105) (getThreePtTendency, getDriveTendency, getPullUpTendency, getFoulDrawTendency)
  * [shotEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/shotEngine.ts#L113) (uses calculateShotIntentWeights to scale shot weights)
  * [playerIntentSelection.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/playerIntentSelection.ts) (calculateShotIntentWeights scales driveTendency and pullUpTendency based on stamina)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts#L1716) (uses getFoulDrawTendency to determine base foul chances and flop/four-point bait triggers)
* **What Code Does**: Applies drive, pull-up, three-point, and foul draw tendencies directly inside the gameplay loop, properly scaled down by player fatigue.
* **Tests**: [test_tendency_wiring.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_tendency_wiring.ts) passes.
* **Risk Level**: MEDIUM
* **Recommended Next Step**: Maintain as-is.

### 7. Player Attribute Integrity and OVR Protection
* **Status**: DONE
* **Evidence File Paths**:
  * [starGrowth.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/starGrowth.ts#L119) (applyStarGrowth sets ovr: player.ovr)
  * [GameStateContext.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/context/GameStateContext.tsx#L949) (ascendPlayer consumes duplicates and updates player cards via applyStarGrowth)
  * [starRequirements.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/starRequirements.ts#L3) (getRequiredDuplicateCount handles duplicate gating)
* **What Code Does**: Guarantees OVR and salaries are protected from star-up upgrades. Star-up upgrades only boost core gameplay attributes and stamina, and unlock learned skill slots. Roster load safely repairs star growth to prevent double-boosting.
* **Tests**: [test_player_attribute_integrity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_player_attribute_integrity.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Proceed to BaseSkillRealDataLock.

### 8. Base Skill Real Data Lock
* **Status**: DONE
* **Evidence File Paths**:
  * [skillCatalog.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillCatalog.ts) (Defines all 22 base skills inside BASE_SKILL_TEXT and BASE_SKILL_RATES)
  * [assignBaseSkills.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/assignBaseSkills.ts) (assignBaseSkillsFromStats maps players to their 3 base skills using currentSeasonStats or attribute fallbacks)
  * [skillResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillResolver.ts) (hasBaseSkill, getActiveBaseSkills, rollBaseSkill, getTriggerBoost, getDrainMultiplier)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (Wires every base skill to active match resolution)
* **What Code Does**: Enforces that exactly 22 base skills exist in the catalog, assigned deterministically using real NBA stats or fallback stats, separate from learned special families, stable against star-up boosts, and fully active in match resolution.
* **Tests**: [test_base_skill_real_data_lock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_base_skill_real_data_lock.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Proceed to UpgradeSystemFinalLock.

### 9. Upgrade System Final Lock
* **Status**: DONE
* **Evidence File Paths**:
  * [starRequirements.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/starRequirements.ts) (Exact 20-duplicate matrix limits duplicate requirements to approved milestones)
  * [starGrowth.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/starGrowth.ts) (applyStarGrowth, repairStarGrowth, getDetailedAttributes, handles finishing stat growth and repair)
  * [nbaAttributeMapper.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/nbaAttributeMapper.ts) (deriveAttributesFromNbaStats maps finishing baseline)
  * [mockPlayers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/data/mockPlayers.ts) (maps finishing to mock player card properties)
  * [GameStateContext.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/context/GameStateContext.tsx#L949) (ascendPlayer, success rates, failure safety, learned skill sacrifice warning, clean copy prioritization)
* **What Code Does**: Locks card upgrade safety and duplicate count requirements. Upgrade success rate starts at 100% (Silver ★1) and bottoms at 5% (Red ★5). Materials are consumed on failure but card and duplicates remain safe. Star growth is repaired on reload. Fully integrates the finishing sub-attribute into both star growth and NBA stats derivation mapping.
* **Tests**: [test_upgrade_system_final_lock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_upgrade_system_final_lock.ts) and [test_player_attribute_integrity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_player_attribute_integrity.ts) pass.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 10. NBA Data Pipeline Lock
* **Status**: DONE
* **Evidence File Paths**:
  * [test_nba_data_pipeline_final_lock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_nba_data_pipeline_final_lock.ts) (data validation test)
  * [lineupValidation.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/lineupValidation.ts) (lineup validation helpers)
  * [player.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/types/player.ts) (InjuryStatus type definitions)
  * [mockPlayers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/data/mockPlayers.ts) (injury availability mapping)
* **What Code Does**: Guarantees players are parsed correctly from players_update.json data source, verifies OVR ranking brackets, delta caps, salary formulas, season transition stats fallbacks, pre-match injury availability, and enforces that no random in-match injuries exist.
* **Tests**: [test_nba_data_pipeline_final_lock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_nba_data_pipeline_final_lock.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 11. Attribute Model Refinement (IQ & Hustle)
* **Status**: DONE
* **Evidence File Paths**:
  * [player.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/types/player.ts) (Player interface detailed attributes)
  * [nbaAttributeMapper.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/nbaAttributeMapper.ts) (NbaDerivedAttributes and deriveAttributesFromNbaStats formula mapping)
  * [starGrowth.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/starGrowth.ts) (DetailedAttributes, getDetailedAttributes, applyStarGrowth growth rates, repairStarGrowth baseline resets)
  * [playerIdentity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/playerIdentity.ts) (getBasketballIQRating, getHustleRating helpers)
  * [mockPlayers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/data/mockPlayers.ts) (mapped basketballIQ and hustle)
* **What Code Does**: Integrates basketballIQ and hustle gameplay attributes with derivation formulas from NBA stats, implements half-rate star-up growth for basketballIQ, full-rate for hustle, protects existing card face rating derivation, and handles backwards compatibility fallbacks.
* **Tests**: [test_attribute_model_refinement.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_attribute_model_refinement.ts) and [test_player_attribute_integrity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_player_attribute_integrity.ts) pass.
* **Risk Level**: SAFE
* **Recommended Next Step**: Proceed to matchEngine wiring phase.

### 12. Match Engine Wiring (IQ & Hustle Integration)
* **Status**: DONE
* **Evidence File Paths**:
  * [attributeGameplayEffects.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/attributeGameplayEffects.ts) (turnover, rebound, Discipline Wall scale, pressure shot, hustle contest helpers)
  * [shotResolution.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/shotResolution.ts) (hustleContestMod and basketballIQPressureMod parameters and math)
  * [reboundSystem.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/reboundSystem.ts) (hustle-based rebound score multiplier)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (wired turnover scaling, Discipline Wall scaling, pressure shot mitigation, and hustle contest multipliers)
* **What Code Does**: Integrates the new detailed attributes directly into match gameplay equations, providing defensive contest bonuses, pressure resistance, rebound enhancement, and turnover reduction.
* **Tests**: [test_attribute_gameplay_wiring.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_attribute_gameplay_wiring.ts) and [test_shooting_foul_symmetry.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_shooting_foul_symmetry.ts) pass.
* **Risk Level**: SAFE
* **Recommended Next Step**: Proceed to Match Realism Calibration phase.

### 13. Match Realism Calibration
* **Status**: DONE
* **Evidence File Paths**:
  * [sim_match_realism_calibration.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/balance/sim_match_realism_calibration.ts)
  * [test_match_realism_calibration.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_match_realism_calibration.ts)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (AI shot clock violation check)
* **What Code Does**: Runs simulation sweeps verifying that baseline team scoring (95-130), FG% (42-55%), 3PT% (30-42%), rebounds (35-60), turnovers (8-20), and fouls (12-28) are fully within NBA-realistic target bounds. Confirms that High-IQ reduces turnovers symmetrically and High-Hustle improves team rebounds without inflating/deflating other metrics.
* **Tests**: [test_match_realism_calibration.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_match_realism_calibration.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Proceed to UI updates phase.

### 14. Glass Strike Putback Gating
* **Status**: DONE
* **Evidence File Paths**:
  * [reboundSystem.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/reboundSystem.ts) (calculateOffensiveReboundChance)
  * [matchHelpers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/matchHelpers.ts) (getGlassStrikeOrebBoost, getGlassStrikePutbackBoost)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (triggers putback action loops)
* **What Code Does**: Increases offensive rebound rate and provides putback shot quality multipliers based on rebound archetype level.
* **Tests**: [test_glass_strike_gating.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_glass_strike_gating.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 15. Bench Captain Integration
* **Status**: DONE
* **Evidence File Paths**:
  * [archetypeEffects.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/archetypeEffects.ts) (getBenchCaptainIdentity, calculateBenchCaptainRecovery)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (applyBenchCaptain)
* **What Code Does**: Triggers stamina stabilization for tired court players and increases benched player recovery once per quarter.
* **Tests**: [test_bench_captain_gating.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_bench_captain_gating.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 16. Defensive Anchor Team Boost
* **Status**: DONE
* **Evidence File Paths**:
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (applyDefensiveAnchor, Defensive Anchor recalculation)
* **What Code Does**: Calculates a team defensive IQ rating boost dynamically every tick depending on the Defensive Anchor leader's stamina and capability score. The boost does not stack if multiple anchors are on court.
* **Tests**: [test_skill_system_hard_reset_final_lock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_system_hard_reset_final_lock.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 17. 15-Family Skill System Hard Reset & Final Lock
* **Status**: DONE
* **Evidence File Paths**:
  * [staminaSkillEffects.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/staminaSkillEffects.ts) (only contains getSkyWallDrain, getLockChainDrain, and applyAntiSnowballScaling)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (removed all legacy stubs and drains, updated to pass skill rarity to drains)
* **What Code Does**: Completely replaces 15 legacy X skills with the new clean family ID system, eliminates all unused stamina drains (Defensive Anchor, Power Driver, Poster Spark, Bench Captain, Gameplan Jammer), and implements exact rarity-based drains for Sky Wall (3/5/7/9) and Lock Chain (2/4/6/8) with proper anti-snowball scaling bounds (0.60x at <50% stamina, 0.30x at <30% stamina).
* **Tests**: [test_skill_system_hard_reset_family_effects.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_system_hard_reset_family_effects.ts) and [test_skill_system_hard_reset_final_lock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_system_hard_reset_final_lock.ts) pass.
* **Risk Level**: SAFE
* **Recommended Next Step**: Proceed to UI updates phase.

### 18. Match Engine Major Decomposition
* **Status**: DONE
* **Evidence File Paths**:
  * [matchTick.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/matchTick.ts) (core simulation loops, period progression, scoring, clock orchestration)
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) (compatibility entry point wrapper delegating to matchTick.ts)
  * [foulResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/foulResolver.ts) (free throw sequence execution, foul committer picker)
  * [reboundResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/reboundResolver.ts) (rebounder picking, board award logic)
  * [shotPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/shotPossessionResolver.ts) (shot intent selection, action stamina tracking, shot resolution execution)
  * [userPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/userPossessionResolver.ts) (User offense resolution)
  * [aiPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/aiPossessionResolver.ts) (AI offense resolution)
* **What Code Does**: Decomposes the massive 3,600+ line gameplay execution engine into logical, cohesive sub-modules. The main entry point (`matchEngine.ts`) is reduced to a slim wrapper maintaining 100% public compatibility.
* **Tests**: `test_match_engine_snapshot_baseline.ts --verify`, `test_skill_system_hard_reset_final_lock.ts`, and `test_match_realism_calibration.ts` pass cleanly with exact snapshot behavioral parity.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 19. Storage Duplicate Instance Final Audit
* **Status**: DONE
* **Evidence File Paths**:
  * [playerCardIdentity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/playerCardIdentity.ts) (getPlayerDuplicateKey, isCardInstanceActive, getAscensionCandidates, sortAscensionCandidates, hasLearnedSpecialSkills)
  * [GameStateContext.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/context/GameStateContext.tsx) (centralized getAscensionCandidates and sortAscensionCandidates calls)
  * [PlayerHexProfileModal.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/components/player/PlayerHexProfileModal.tsx) (integrated getAscensionCandidates for exact candidate preview)
* **What Code Does**: Centralizes player card duplication checks and filters. Restricts card consumption during upgrades to exact owned instance IDs. Protects starting 5 active lineup and reserves bench cards from accidental sacrifice. Corrects the UI preview to reflect identical logic as the state upgrade execution, preventing display/execution candidates mismatch. Supports robust active checks across sets, arrays, maps, and slot configurations.
* **Tests**: [test_storage_duplicate_instance_final_audit.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_storage_duplicate_instance_final_audit.ts) passes.
* **Risk Level**: SAFE
### 20. Skill UI and Storage UI Cleanup
* **Status**: DONE
* **Evidence File Paths**:
  * [SkillBadge.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/components/skills/SkillBadge.tsx) (Updated skillArtMap and getSkillArtSrc to load clean family assets without quality suffixes)
  * [skillCatalog.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillCatalog.ts) (Verified clean, non-toxic, non-legacy descriptions)
  * `public/skills/family/` (Contains the 15 official family skill PNG files)
* **What Code Does**: Replaces legacy visual asset references with clean family-level assets under a dedicated folder. Maps both the official family IDs and the legacy names to the new family folder paths. Drops all quality suffixes from the family skill paths (shares a single clean icon per family) while keeping UI border/frame/color to show rarity.
* **Tests**: [test_skill_ui_storage_cleanup.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_ui_storage_cleanup.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 21. RPG-Style Status Marks Integration
* **Status**: DONE
* **Evidence File Paths**:
  * [MatchPlayerUnit.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/features/match/components/MatchPlayerUnit.tsx) (activeMarks rendering)
  * [PlayerTooltip.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/features/match/components/PlayerTooltip.tsx) (tooltip activeMarks preview)
  * [page.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/app/match/page.tsx) (passes activeMarks prop)
  * `public/marks/` (Contains sliced transparent icons for exposed, tilted, hooked, pinned, and static marks)
* **What Code Does**: Slices 5 mark icons from the user's uploaded image, transparentizes their backgrounds, squares and resizes them to 128x128. Renders these marks as small status badges (with counters) at the top of player cards during matches, and lists their details on details hover.
* **Tests**: `npx tsc --noEmit` and `test_stamina_risk_regression.ts` pass cleanly.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 22. Player Storage Visual QA
* **Status**: DONE
* **Evidence File Paths**:
  * [PlayerCard.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/components/player/PlayerCard.tsx) (Repositioned injury OUT badge to top-left container under OVR and Position to resolve layout clashing)
  * [SkillBadge.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/components/skills/SkillBadge.tsx) (Auto-resolves signature skill category color highlights for Offense, Defense, and Comprehensive)
  * [PlayerHexProfileModal.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/components/player/PlayerHexProfileModal.tsx) (Polished duplicate sacrifice warning to render clean, readable display names using getSkillDisplayName)
* **What Code Does**: Audits, aligns, and polishes player storage, lineup, bench, and duplicate card layouts. Resolves badge overlap issues on player cards and formats learned special skill warnings on ascension upgrade previews.
* **Tests**: `npx tsc --noEmit` and all 4 validation test scripts compile and pass successfully.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 23. Skill Description Final QA
* **Status**: DONE
* **Evidence File Paths**:
  * [skillCatalog.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillCatalog.ts) (Verified clean, non-toxic, non-legacy descriptions)
  * [PlayerHexProfileModal.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/components/player/PlayerHexProfileModal.tsx) (Category labels display strictly as Offense, Defense, or Comprehensive using getSpecialSkillFamilyDefinition)
  * [test_skill_description_final_qa.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_description_final_qa.ts) (Automated description and category label audit validation test)
* **What Code Does**: Audits and polishes player-facing skill descriptions, tooltips, catalog text, modal text, and category labels. Category labels display strictly as "Offense", "Defense", or "Comprehensive". Opponent stamina drain mentions are restricted to Sky Wall and Lock Chain, and toxic wording or legacy "X" suffixes are completely eliminated from player-facing UI text.
* **Tests**: [test_skill_description_final_qa.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_skill_description_final_qa.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

### 24. Match Skill Event UI Final QA
* **Status**: DONE
* **Evidence File Paths**:
  * [aiPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/aiPossessionResolver.ts) (Title Case skill display names and Deep Strike reference)
  * [userPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/userPossessionResolver.ts) (Title Case skill display names and Deep Strike reference)
  * [possessionHelpers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/possessionHelpers.ts) (Replaced SKY_WALL: prefix with Sky Wall:)
  * [shotPossessionResolver.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/shotPossessionResolver.ts) (Rewrote Court Vision Engine Debt wording to builds passing rhythm)
  * [matchTick.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/engine/matchTick.ts) (Replaced SKY_WALL: prefix with Sky Wall:)
  * [PlayerTooltip.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/features/match/components/PlayerTooltip.tsx) (Added Exposed, Tilted, Hooked, Pinned, Static mark descriptions)
  * [test_match_skill_event_ui_final_qa.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_match_skill_event_ui_final_qa.ts) (Automated validation test)
* **What Code Does**: Audits and polishes player-facing match skill popups, event logs, commentary, and mark labels. Ensures no legacy X suffixes appear in match UI text, maps all raw official ID prefixes to Title Case, rewrote Court Vision Engine event messages to builds passing rhythm without altering underlying marks/logic, restricts opponent stamina drain references to Sky Wall and Lock Chain, and adds clean description text to all active marks in PlayerTooltip.
* **Tests**: [test_match_skill_event_ui_final_qa.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/validation/test_match_skill_event_ui_final_qa.ts) passes.
* **Risk Level**: SAFE
* **Recommended Next Step**: Maintain as-is.

---

## Section 2: Done but Needs Continued Regression

None. All tests are passing cleanly.

---

## Section 3: Partial Systems

### 1. Strategy Commentary Hints
* **Status**: PARTIAL
* **Evidence File Paths**:
  * [matchHelpers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/match/matchHelpers.ts#L138-L250) (getSubtleStrategyHint)
* **Missing Work**: While getSubtleStrategyHint provides clean, descriptive text for all strategies, the hints do not dynamically influence User tactical decision feedback systems in the UI yet.
* **Risk Level**: SAFE
* **Recommended Next Step**: Connect strategy commentary hints to stadium/lobby chat or matching UI event displays.

---

## Section 4: Not Implemented Systems

None. All 15 planned learned special skill families and mechanics are now fully implemented, integrated, and verified.

---

## Section 5: Blocked Systems and Why

### 1. Match Tick Events and Narrative Logging Modularity
* **Status**: BLOCKED
* **Evidence File Paths**:
  * [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts#L1482-L3155) (User and AI possession blocks)
* **Reason Blocked**: The core tick loops, time increments, and event narrative logs are highly coupled with the local variables within simulateTick's massive closure. Extracting the event array mutations (newEvents.push) and RNG rolls out of the main file risks breaking deterministic replay sync, tick durations, and match sequence ordering.
* **Risk Level**: CRITICAL
* **Recommended Next Step**: Do not attempt to extract the game loop. Keep simulateTick as the controller.

---

## Section 6: Needs Real NBA Data Verification

### 1. NBA Stats overlay mapper check
* **Status**: NEEDS DECISION
* **Evidence File Paths**:
  * [nbaAttributeMapper.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/nbaAttributeMapper.ts) (deriveAttributesFromNbaStats)
  * [mockPlayers.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/data/mockPlayers.ts) (contains players with missing/static currentSeasonStats)
* **Verification Needed**: Confirm that derived attributes map correctly for real NBA players compared to official ratings. Validate the blend weights used to translate traditional stats (PPG, RPG, AST) into game attributes (twoPt, rebound, assist).
* **Risk Level**: MEDIUM
* **Recommended Next Step**: Run scripts/report-player-updates.mjs and review stats calculations.

---

## Section 7: Needs UI Verification

### 1. Substitution Overlay overlap
* **Status**: NEEDS TEST
* **Evidence File Paths**:
  * [SubstitutionModal.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/features/match/components/SubstitutionModal.tsx)
  * [FreeThrowPopup.tsx](file:///c:/Users/Nhico/Documents/School/dream-team/src/features/match/components/FreeThrowPopup.tsx)
* **Verification Needed**: Manual verification of double overlays when an auto-substitution is requested during free throw sequences.
* **Risk Level**: MEDIUM
* **Recommended Next Step**: Test in browser client.

---

## Section 8: Needs Balance Verification

### 1. Baseline Stamina Economy and Zero-Stamina Events
* **Status**: NEEDS TEST
* **Evidence File Paths**:
  * [sim_accurate_mock.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/scripts/balance/sim_accurate_mock.ts)
* **Verification Needed**: Run mock game simulations to check if Q4 players frequently hit zero stamina under high-tempo strategies.
* **Risk Level**: HIGH
* **Recommended Next Step**: Execute sim_accurate_mock.ts and collect stats on Q4 player stamina.

---

## Section 9: Recommended Safe Implementation Order

All core special skill family implementations are complete:
- Phase AuditRepair: Completed and verified.
- Phase TendencyWiring: Completed and verified.
- Phase MomentumSwing: Completed and verified.
- Phase BrokenPlayRescue: Completed and verified.
- Phase LearnedFamilyFinalLock: Completed and verified.
- Phase PlayerAttributeFinalAudit: Completed and verified.
- Phase BaseSkillRealDataLock: Completed and verified.
- Phase UpgradeSystemFinalLock: Completed and verified.
- Phase NBADataPipelineFinalLock: Completed and verified.
- Phase AttributeModelRefinement: Completed and verified.
- Phase MatchEngineWiring: Completed and verified.
- Phase CourtVisionMechanicOwnershipAudit: Completed and verified. Removed legacy Hooked mark applications from Court Vision Engine in shotPossessionResolver.ts. Hooked now belongs exclusively to Lock Chain.
- Phase FullSkillOwnershipSweep: Completed and verified. All 15 learned families comply with ownership rules. Zero violations found. 20-check validation script added.
- Phase LockChainDrainOwnershipAudit: Completed and verified. Removed 2 hidden Lock Chain drain paths: (1) single-target drain on all turnovers, (2) per-possession on-ball shot drain. Lock Chain now drains only after successful steals.

Next phases:
1. **Phase UI**: Update hex chart, player detail panels, and compare card overlay components to display the new attributes.las.



