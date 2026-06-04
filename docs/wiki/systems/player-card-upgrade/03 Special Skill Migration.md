# Special Skill Migration

## Overview
The special skill system has been migrated from 15 legacy hardcoded skill strings to the 15 Special Skill Families from `skillFamilies.ts`. Legacy `" X"` skills are deprecated and retired from rolling, active slots, and UI displays.

**Current status:** Active family rolling is live. Saved roster data is migrated in-place upon loading. Engine mechanics trigger via family IDs.

---

## Architecture Layers

### Card Era & Skill Tier Naming (Phase 2A1)
- **Card Eras:** Current → Prime → Legend
- **Skill Tiers:** Standard → Prime → Legacy → Signature
- Added: `src/lib/players/playerCardTypes.ts`, `src/lib/players/playerEra.ts`, `src/lib/skills/skillDisplay.ts`, `src/lib/skills/skillMigration.ts`

### Family Catalog (Phase 2A2)
- Added: `src/lib/skills/skillFamilies.ts`
- Defined 15 family IDs in 3 categories (5 Offense / 5 Defense / 5 Comprehensive).
- Legacy skills map to families via `resolveSpecialSkillFamily()`.
- `isLegacySpecialSkillName()` identifies old strings.

### Family-Aware Resolver Helpers (Phase 2A4)
- `resolveSpecialSkillFamily()` returns the parent family for any skill string.
- `getSpecialSkillQuality()` reads rarity from `skillRarities`.
- `formatSkillName()` handles both legacy and future display.

### Family-Aware Duplicate Prevention (Phase 2A5)
- `wouldCreateDuplicateFamily()` blocks rolling a skill from the same family as an equipped skill.
- A player with `Red Dot X` cannot roll `Four-Point Bait X` (both map to `DEEP_STRIKE`).
- Works correctly for both legacy strings and future family IDs.

### Flop Preservation (Phase 2A10.5)
- Replaced `HANGTIME_FINISH` with `FLOP` in the family catalog.
- Flop is one of the final 15 families.
- `Flop X` maps to `FLOP`. It no longer maps to `HANGTIME_FINISH`.
- Flop is protected and must not be removed or renamed.

---

## Mechanic Adapters

### Mechanic Adapter Helpers (Phase 2A7)
- Added: `src/lib/skills/skillMechanics.ts`
- Defined `SpecialSkillMechanicId` type and `LEGACY_TO_MECHANIC_MAP`.
- Helpers: `resolveSpecialSkillMechanics()`, `doesSkillMatchMechanic()`, `hasSpecialSkillMechanic()`, `getPlayerSpecialSkillMechanics()`, `getSpecialSkillsForMechanic()`.
- Future family IDs intentionally resolve to no mechanics (empty array) to prevent accidental inheritance.

### Mechanic-Aware Trigger Helpers (Phase 2A8)
- Added to `src/lib/skills/skillResolver.ts`: `getBestSpecialSkillForMechanic()`, `rollSpecialMechanic()`.
- `rollSpecialMechanic()` preserves rarity scaling by resolving the exact raw legacy skill key for rate lookup.

---

## MatchEngine Migration Batches

All batches replaced direct legacy string checks (`rollSpecial(...)`) with mechanic adapter calls (`rollSpecialMechanic(...)` / `hasSpecialSkillMechanic(...)`). Rarity scaling is preserved because the helpers resolve the exact raw legacy skill key.

| Batch | Phase | Skills Migrated |
|---|---|---|
| A | 2A9 | Cold Timeout X, Composure X, Clean Contest X |
| B | 2A10 | Chain Pass X, Cage Step X |
| C | 2A11 | Red Dot X, Contact Tax X, Corner Trap X |
| D | 2A12 | Dead Air X |
| E | 2A13 | Debt Collector X, Pressure Coach X |
| F | 2A14 | Lung Burner X, Five-Man Squeeze X |
| G | 2A15 | Flop X, Four-Point Bait X |

### Stability Lock (Phase 2A16)
- Full 30-match regression passed.
- Combined score: 180–225. FG%: 35%–55%. 3PT%: 25%–60%.
- FTA: 12–26 per team. No 40+ FTA explosions.
- Turnovers: 9–17. Steals: 3–8. Blocks: 2–6. OREB: 7–15.
- All 15 legacy learned skills trigger correctly.
- All marks apply, expire, and interact correctly.
- Flop/SGA modifier works. Four-Point Bait requires Exposed.
- Stamina drains correctly; no collapse. Substitutions cycle naturally.
- Saved data not mutated. Rarity keys unchanged.
- **Mechanic migration is locked stable.**

---

## Rolling Pool Activation Plan (Phase 2A17)

### Activation Risks
- New family IDs do not have native matchEngine mechanics yet.
- New family IDs are not in `SPECIAL_SKILL_RATES`.
- Missing base rates would break trigger math.
- New family IDs may lack icon assets and tooltip descriptions.
- Activating now would create skills that display poorly or do nothing in matches.

### Decision
- **Option D approved:** Keep legacy roll pool until each new family gets real mechanics and UI/rate support.
- **Recommendation E approved:** Keep legacy roll pool and start designing native mechanics family by family.
- No save migration yet.

---

## Native Mechanics Design (Phase 2B1)

Design audit completed for all 15 families. Key principles:
- Reduced stamina-drain identity (less oppressive team-wide drains).
- Flop protected for SGA / Harden / Luka-type foul drawers.
- Rarity scales trigger chance, not effect power.
- New mechanics must be basketball-authentic.

Next implementation starts with **Batch 1: Counters/Utility** (COMPOSURE_SHIELD, CLEAN_CHALLENGE, TIMEOUT_RESET, BENCH_CAPTAIN, COURT_VISION_ENGINE).

New rolling pool will NOT be activated until all 15 mechanics are built, base rates added, descriptions written, icons verified, and balance regression passed.

---

## Native Mechanics Batch A (Phase SpecialSkill-2B2)

We mapped the first batch of native Special Skill Family IDs (Batch A: Safe Counters/Utility) directly in the match engine:
* `CLEAN_CHALLENGE` -> `CLEAN_CHALLENGE_CONTEST`
* `COMPOSURE_SHIELD` -> `COMPOSURE_SHIELD_CANCEL`
* `TIMEOUT_RESET` -> `TIMEOUT_RESET_CLEANSE`

### Implementation Details:
- **Mechanics Mapping**: Wired inside `src/lib/skills/skillMechanics.ts` within `LEGACY_TO_MECHANIC_MAP`.
- **Base Rate Support**: Set in `src/lib/skills/skillCatalog.ts` under `SPECIAL_SKILL_RATES` to match legacy rates (`CLEAN_CHALLENGE: 260`, `COMPOSURE_SHIELD: 330`, `TIMEOUT_RESET: 260`).
- **Description Support**: Added under `SPECIAL_SKILL_TEXT` for the new family IDs.
- **Visual Safety**: Added fallback icon mappings in `SkillBadge.tsx` (`skillArtMap`) routing the lowercase names to legacy asset files (`clean-contest-x`, `composure-x`, `cold-timeout-x`) to ensure smooth visual fallback without breaking layouts.
- **Rolling Pool Isolation**: Explicitly filtered the rolling pool (`SPECIAL_SKILL_NAMES`) to only allow items ending in `" X"`, leaving the new family IDs out of natural rolls (which prevents them from showing up during active play or upgrades unless manually assigned for testing).
- **TypeScript Integration**: Registered the new family IDs in the `SpecialSkillName` union type.

---

## Native Mechanics Batch B (Phase SpecialSkill-2B3)

We mapped the second batch of native Special Skill Family IDs (Batch B: Playmaking / Rotation Utility) directly in the match engine:
* `COURT_VISION_ENGINE` -> `COURT_VISION_RHYTHM`
* `BENCH_CAPTAIN` -> `BENCH_CAPTAIN_STABILIZE`

### Implementation Details:
- **Mechanics Mapping**: Wired inside `src/lib/skills/skillMechanics.ts` within `LEGACY_TO_MECHANIC_MAP`. Registered two new mechanic IDs: `COURT_VISION_RHYTHM` and `BENCH_CAPTAIN_STABILIZE`.
- **Base Rate Support**: Set in `src/lib/skills/skillCatalog.ts` under `SPECIAL_SKILL_RATES` (`COURT_VISION_ENGINE: 240`, `BENCH_CAPTAIN: 220`).
- **Description Support**: Added under `SPECIAL_SKILL_TEXT` for the new family IDs.
- **Visual Safety**: Added fallback icon mappings in `SkillBadge.tsx` (`skillArtMap`) routing `"court_vision_engine"` to `"chain-pass-x"` and `"bench_captain"` to `"pressure-coach-x"`.
- **Match Engine Integration**:
  - **Court Vision Rhythm**: Hooked in shot evaluation block. Restricts triggers to non-isolation plays only (`currentOff !== "Isolation (ISO)" && currentOff !== "Post Isolation"`). Yields a tiny shot quality bonus scaling with assist rating (`0.012` to `0.018`), hard-capped at `+0.02`. Max one trigger per possession. Does not apply marks or drain stamina.
  - **Bench Captain Stabilization**: Hooked at tick start. Only checks when team average stamina is below `65` OR lowest on-court stamina is below `45`. Targets only the single lowest-stamina player on court, recovering `5` to `8` stamina (hard-capped at `8`). If target is cold (`formRating < 1.0`), stabilizes form with a tiny boost (`+0.004` to `+0.008`).
  - **Cooldown**: Limits triggers to once per quarter per team using separate keys (`User Bench Captain Q[1-4]` and `AI Bench Captain Q[1-4]`) to ensure User and AI triggers never conflict or block each other.
- **Rolling Pool Isolation**: Excluded from the natural rolling pool (`SPECIAL_SKILL_NAMES`), while legacy `Chain Pass X` and `Pressure Coach X` remain active and roll naturally.
- **Saved Data / Rarity Keys**: Untouched. OVR/star-up separation is fully preserved.

---

## Native Mechanics Batch C (Phase SpecialSkill-2B4)

We mapped the third batch of native Special Skill Family IDs (Batch C: Single-Target Defensive Stamina Pressure) directly in the match engine:
* `LOCK_CHAIN` -> `LOCK_CHAIN_ON_BALL_PRESSURE`
* `SKY_WALL` -> `SKY_WALL_RIM_PRESSURE`

`DEFENSIVE_ANCHOR` is delayed to a future team-wide stamina pressure phase.

### Implementation Details:
- **Mechanics Mapping**: Wired inside `src/lib/skills/skillMechanics.ts` within `LEGACY_TO_MECHANIC_MAP`. Registered two new mechanic IDs: `LOCK_CHAIN_ON_BALL_PRESSURE` and `SKY_WALL_RIM_PRESSURE`.
- **Base Rate Support**: Set in `src/lib/skills/skillCatalog.ts` under `SPECIAL_SKILL_RATES` (`LOCK_CHAIN: 240`, `SKY_WALL: 240`).
- **Description Support**: Added under `SPECIAL_SKILL_TEXT` for the new family IDs:
  - `LOCK_CHAIN`: *"Pressures ball handlers with disciplined on-ball defense and controlled stamina drain."*
  - `SKY_WALL`: *"Challenges paint attacks with vertical rim pressure and controlled contest fatigue."*
- **Visual Safety**: Added fallback icon mappings in `SkillBadge.tsx` (`skillArtMap`) routing `"lock_chain"` to `"cage-step-x"` and `"sky_wall"` to `"rim-warden"`.
- **Match Engine Integration**:
  - **Lock Chain On-Ball Pressure**: Hooked in turnover checks and shot contest evaluations. Multiplies turnover chance by `1.03 + (identity / 100) * 0.03` (strictly capped at `1.06`). If triggered on a turnover or contested shot, it applies a single-target stamina drain of `Math.min(12, Math.round(9 * scale))` (range `8–11`, strictly capped at `12`) to the turnover committer or shooter. No marks are applied.
  - **Sky Wall Rim Pressure**: Hooked in shot evaluations for close-range / paint attempts only (`drivingLayup`, `dunk`, `euroStep`, `fingerRoll`, `powerLayup`, `putBack`, `bankShot`, `hookShot`, `floater`). It applies a tiny shot quality penalty of `0.008 + (identity / 100) * 0.004` (strictly capped at `-0.013`), and drains `Math.min(10, Math.round(7 * scale))` stamina (range `6–9`, strictly capped at `10`) from the shooter only. No marks are applied.
- **Rolling Pool Isolation**: Excluded from the natural rolling pool (`SPECIAL_SKILL_NAMES`), while legacy `Cage Step X`, `Corner Trap X`, and `Five-Man Squeeze X` remain active and roll naturally.
- **Saved Data & OVR**: Saved player data, `specialSkillSlots`, rarity keys, and OVR/star-up separation are fully preserved.

---

## Native Mechanics Batch D (Phase SpecialSkill-2B5)

We mapped the fourth batch of native Special Skill Family IDs (Batch D: DEFENSIVE_ANCHOR Team-Wide Stamina Pressure) directly in the match engine:
* `DEFENSIVE_ANCHOR` -> `DEFENSIVE_ANCHOR_TEAM_PRESSURE`

### Implementation Details:
- **Mechanics Mapping**: Wired inside `src/lib/skills/skillMechanics.ts` within `LEGACY_TO_MECHANIC_MAP`. Registered a new mechanic ID: `DEFENSIVE_ANCHOR_TEAM_PRESSURE`.
- **Base Rate Support**: Set in `src/lib/skills/skillCatalog.ts` under `SPECIAL_SKILL_RATES` (`DEFENSIVE_ANCHOR: 220`).
- **Description Support**: Added under `SPECIAL_SKILL_TEXT`:
  - `DEFENSIVE_ANCHOR`: *"Applies disciplined team pressure that wears down opponents across half-court possessions."*
- **Visual Safety**: Added fallback icon mappings in `SkillBadge.tsx` (`skillArtMap`) routing `"defensive_anchor"` to `"corner-trap-x"`.
- **Match Engine Integration**:
  - **Defensive Anchor Team Pressure**: Hooked inside the tick start loop of `simulateTick` in `matchEngine.ts`.
  - **Possession Guard**: Uses `currentPossession` to ensure only the currently defending team can apply the pressure:
    - If `currentPossession === 'user'` (AI defends): `applyDefensiveAnchor(aiLineup, userLineup, false);`
    - If `currentPossession === 'ai'` (User defends): `applyDefensiveAnchor(userLineup, aiLineup, true);`
  - **Fastbreak Guard**: Skips when transition play is active (`pace === 'fastbreak'`).
  - **Cooldown**: Capped at max once per quarter per team using team-specific keys: `User Defensive Anchor Q[1-4]` / `AI Defensive Anchor Q[1-4]`. Cooldown keys are only set/marked on successful rolls.
  - **Stamina Drain & Counterplays**:
    - Base drain: `baseDrain = Math.min(20, Math.round(15 * scale))` (expected range `12–18`, capped at `20`).
    - Counter Type B (Team Leadership): If the drained team has any counter leader (`BENCH_CAPTAIN`, `COMPOSURE_SHIELD`, or `TIMEOUT_RESET`), reduces team-wide drain by `10%–20%` (capped at `20%`) based on the best leader's Calm/Stamina/Assist identity.
    - Counter Type A (Player Natural Resistance): Reduces received drain per target based on their stamina rating: `targetResistance = (getStaminaRating(target) / 100) * 0.15` (up to 15% reduction).
    - Counter Type C (Anti-Snowball): If target stamina pct < 30%, reduces final drain by 70% (`Math.round(amount * 0.3)`). Else if target stamina pct < 50%, reduces final drain by 40% (`Math.round(amount * 0.6)`).
    - Final drain is clamped to $\ge 0$. No marks are applied.
- **Rolling Pool Isolation**: Excluded from the natural rolling pool (`SPECIAL_SKILL_NAMES`), while legacy `Corner Trap X` and `Five-Man Squeeze X` remain active and roll naturally.
- **Saved Data & OVR**: Saved player data, `specialSkillSlots`, rarity keys, and OVR/star-up separation are fully preserved.


