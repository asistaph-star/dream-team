# Current Canonical System State

This is the single source of truth for the Player Card, Upgrade, and Skill systems.

---

## Player Model
`src/lib/types/player.ts` defines the player card: name, position, rarity, level, EXP, OVR, offense, defense, shooting, speed, strength, playmaking, stamina, salary, price, trend, detailed attributes (including `basketballIQ` and `hustle`), current-season stats, injury status, star level, base skills, special learned skill slots, skill rarities, and skill tiers.

## OVR
- OVR comes **only** from the NBA Data Pipeline (`players_update.json` ➔ `mockPlayers.ts` ➔ `nbaAttributeMapper.ts`).
- Star-up **does not** increase OVR. `applyStarGrowth` explicitly enforces `ovr: player.ovr`.
- Card rarity matches OVR brackets (Mythic: 95+, Legendary: 85-94, Epic: 75-84, Rare: 65-74, Common: <65).

## Gameplay Attributes (IQ & Hustle)
- **basketballIQ**: Derived from traditional stats (Play security [A/TO ratio], shooting efficiency [TS%], foul control [PF/G], and defensive contest/deflection indicators) or calm/playmaking fallbacks. Wired into turnover mitigation, Discipline Wall defender scaling, and shot clock/fatigue/heavy-contest pressure mitigation in shot resolution.
- **hustle**: Derived from hustle-specific stats (loose ball recovery, deflections, contested shots, charges drawn) or speed/stamina fallbacks. Wired into team rebounding score enhancement and contested shot defensive effort quality degradation.

## Star-Up
- Star-up only boosts gameplay attributes and unlocks Learned Skill slots.
- 25 total star levels across 5 tiers: Silver, Blue, Violet, Orange, Red (5 levels each).
- **Boost Values**:
  - Stamina: +2 per star level.
  - Detailed gameplay attributes (`threePt`, `twoPt`, `freeThrow`, `finishing`, `handle`, `assist`, `steal`, `block`, `rebound`, `onBall`, `calm`, `hustle`) and core sub-ratings (`shooting`, `playmaking`, `speed`, `strength`) are boosted by `attributeGain` matching the star's color tier:
    - Silver/Blue: +1 per star level
    - Violet: +2 per star level
    - Orange: +3 per star level
    - Red: +4 per star level
  - **basketballIQ Star Growth Exception**: basketballIQ is upgraded at **half-rate** (half of the star tier's `attributeGain`, rounded down, yielding 0 at Silver/Blue, 1 at Violet, 1 at Orange, and 2 at Red) to maintain long-term balance.
- **Preservation & Repair**:
  - Roster load calls `repairStarGrowth(player, baseline)` which completely resets stats to baseline and re-applies star growth based on the current `starLevel`. This prevents double-applied boosts, and guarantees data integrity on load.
- Learned Skill Slot 1 unlocks at Star 1.
- Learned Skill Slot 2 unlocks at Star 5.

## Player Tendencies
- **threePtTendency**: Controls the base 2PT/3PT shot selection ratio inside `generateShot`.
- **driveTendency**: Scales driving/rim shot frequency (e.g. drivingLayup, euroStep, floater, fingerRoll, dunk, powerLayup).
- **pullUpTendency**: Scales pull-up jumper shot frequency (e.g. pullUpMid, stepBackMid, fadeaway, pullUpThree, stepBackThree).
- **foulDrawTendency**: Scales base shooting foul chance and increases activation chance of foul-related skills (Flop and Four-Point Bait).
- **Stamina Decay Gating**: Drive and pull-up tendency multipliers scale down using stepped stamina factor buckets based on current player stamina (>=70%: 1.0x, >=40%: 0.75x, >=20%: 0.50x, <20%: 0.25x).

---

## Base Skills — LOCKED STABLE (Phase BaseSkillRealDataLock)

> **22 base skills exist, are fully active, and are officially locked stable as of Phase BaseSkillRealDataLock.**
> All base skills have been verified through tests for deterministic assignment, real NBA stat utilization, and star-up safety.

- **Exactly 22 Base Skills**: Checked and verified in the catalog (`BASE_SKILL_TEXT` and `BASE_SKILL_RATES`). No legacy "X" suffix skills or special learned family IDs are allowed.
- **Deterministic Assignment**: `assignBaseSkillsFromStats` assigns Red, Blue, and Green base skills using real-data seasonal statistics (`currentSeasonStats`) when available.
- **Deterministic Fallbacks**: If `currentSeasonStats` is missing, the player is assigned base skills using safe fallbacks based on their highest baseline attributes (e.g. `threePt`, `finishing`, `rebound`, etc.), ensuring stable and predictable card generation.
- **Star-Up Safe**: Upgraded stats from star levels do not leak into base skill reassignment. `repairStarGrowth` resets player stats to baseline templates before applying star growth, preventing any change in base skills and guaranteeing that previously assigned base skills are preserved.
- **Active Match Effects**: Every base skill is wired into the match engine:
  - *Rolled skills*: Tempo Surgeon, Paint Magnet, Arc Pressure, Mismatch Caller, Glass Touch, Foul Magnet, Power Driver, Rim Warden, Screen Breaker, Hands Active, Paint Barrier, Focus Lock, Connector Hub, Tempo Switch, Share Rhythm, Enforcer Lift, Shadow Guard, Discipline Wall.
  - *Passive/Static skills*: Complete Engine (trigger rate boost), Iron Motor (stamina drain shield/recovery), Position Flex (matchup bonus), Future Core (form recovery).
- 3 base skill slots per player (slot 3 locked until OVR ≥ 85).
- Base skill effects are behaviour-only; they never touch OVR, salary, or rarity.

### Active Base Skills (All 22 Locked Stable)
Arc Pressure, Paint Magnet, Power Driver, Mismatch Caller, Glass Touch, Foul Magnet, Tempo Surgeon, Rim Warden, Hands Active, Screen Breaker, Shadow Guard, Discipline Wall, Paint Barrier, Focus Lock, Complete Engine, Iron Motor, Connector Hub, Tempo Switch, Position Flex, Future Core, Share Rhythm, Enforcer Lift.

---

## Learned Special Skills — LIVE FAMILY ID SYSTEM (Phase SkillArchitecture-Removal-1B)

> **The official learned skill system now uses Special Skill Family IDs. Legacy X skills are fully deprecated and retired from rolling, active slots, and normal UI display.**
> Legacy X skill strings are processed only as compatibility inputs on load, migrating their slots and rarity/tier keys directly to the official family IDs.

- **Active Rolling Pool:** All 15 active families are fully active, rollable, and integrated in the match engine.
- **Saved Data:** Roster slots and `skillRarities`/`skillTiers` keys store family IDs (loaded old saves are migrated in-place during roster normalization).
- **UI Display:** Badges, tooltips, and profile headers display clean family names (e.g., "Deep Strike", "Bench Captain", "Flop"). Legacy X names encountered from old data map to their target family names.
- **Trigger Rate & Quality:** Rarity/quality values (Common to Legendary) and base trigger rates are fully preserved.
- **OVR and star-up:** Completely untouched and separate.

### Active Families & Mechanic Connections
| Category | Family ID | Status | Connected Mechanics |
|---|---|---|---|
| Offense | DEEP_STRIKE | Active / Rollable | DEEP_STRIKE_EXPOSE_SETUP, DEEP_STRIKE_FOUR_POINT_BAIT |
| | COURT_VISION_ENGINE | Active / Rollable | COURT_VISION_RHYTHM, COURT_VISION_CHAIN_PASS |
| | POSTER_SPARK | Active / Rollable | POSTER_SPARK_TILT |
| | FLOP | Active / Rollable | FLOP_SELL_CONTACT (Protected SGA modifier preserved) |
| | BROKEN_PLAY_RESCUE | Active / Rollable | BROKEN_PLAY_RESCUE_SAVE |
| Defense | SKY_WALL | Active / Rollable | SKY_WALL_RIM_PRESSURE |
| | LOCK_CHAIN | Active / Rollable | LOCK_CHAIN_ON_BALL_PRESSURE, LOCK_CHAIN_CAGE_STEP |
| | DEFENSIVE_ANCHOR | Active / Rollable | DEFENSIVE_ANCHOR_TEAM_IQ_BOOST |
| | CLEAN_CHALLENGE | Active / Rollable | CLEAN_CHALLENGE_CONTEST |
| | GLASS_STRIKE | Active / Rollable | GLASS_STRIKE_REBOUND |
| Comprehensive | BENCH_CAPTAIN | Active / Rollable | BENCH_CAPTAIN_STABILIZE |
| | MOMENTUM_SWING | Active / Rollable | MOMENTUM_SWING_STABILIZE |
| | COMPOSURE_SHIELD | Active / Rollable | COMPOSURE_SHIELD_CANCEL |
| | GAMEPLAN_JAMMER | Active / Rollable | GAMEPLAN_DEAD_AIR |
| | TIMEOUT_RESET | Active / Rollable | TIMEOUT_RESET_CLEANSE |


### Legacy Migration Mapping (On Load)
* `Red Dot X` & `Four-Point Bait X` ➔ `DEEP_STRIKE`
* `Chain Pass X` ➔ `COURT_VISION_ENGINE`
* `Contact Tax X` & `Lung Burner X` ➔ `POSTER_SPARK`
* `Flop X` ➔ `FLOP`
* `Cage Step X` ➔ `LOCK_CHAIN`
* `Corner Trap X` & `Five-Man Squeeze X` ➔ `DEFENSIVE_ANCHOR`
* `Clean Contest X` ➔ `CLEAN_CHALLENGE`
* `Composure X` ➔ `COMPOSURE_SHIELD`
* `Cold Timeout X` ➔ `TIMEOUT_RESET`
* `Dead Air X` & `Debt Collector X` ➔ `GAMEPLAN_JAMMER`
* `Pressure Coach X` ➔ `BENCH_CAPTAIN`

---

## Lineup Archetypes — GAMEPLAY-CONNECTED, NOT FINAL-LOCKED
| Archetype | Status |
|---|---|
| Stamina Drain | ✅ Connected and stable |
| Foul-Draw / Flop | ⚠️ Baseline active, counters active, scaling blocked |
| Glass Bully / Rebound | ✅ Connected with GLASS_STRIKE |
| Light Bulb / Playmaking | ✅ Connected with COURT_VISION + BENCH_CAPTAIN gating |
| Deep Strike / Shooting | ✅ Connected with Red Dot + Four-Point Bait hybrid gating |
| Paint Bully | ✅ Connected with POSTER_SPARK |
| Anti-Meta / Gameplan | ✅ Connected with GAMEPLAN_JAMMER |

First balance pass: **complete**.
Final balance audit: **complete** via Match Realism Calibration phase.

---

## Upgrade System — LOCKED STABLE (Phase UpgradeSystemFinalLock)
- **20-total-duplicate matrix**: 1 base card + 20 duplicates = 21 copies required to fully max a player card to Red ★5.
- **Duplicate Milestone Matrix**:
  - **Silver (2 total)**: Star 1 (1 duplicate), Star 5 (1 duplicate).
  - **Blue (2 total)**: Star 5 (2 duplicates).
  - **Violet (4 total)**: Star 3 (2 duplicates), Star 5 (2 duplicates).
  - **Orange (5 total)**: Star 3 (1 duplicate), Star 4 (2 duplicates), Star 5 (2 duplicates).
  - **Red (7 total)**: Star 1 (2 duplicates), Star 3 (2 duplicates), Star 5 (3 duplicates).
  - *All other star target levels (not listed above) require 0 duplicates.*
- **Success Rate Gating**:
  - Silver Star 1 starts at 100% success rate.
  - Red Star 5 bottoms out at exactly 5% success rate.
  - Success rates decay logically within each tier and decrease across tiers for the same level.
- **Failure Rules**:
  - Upgrade failures are 100% safe.
  - Failure consumes upgrade materials/stones only.
  - The base card and duplicates remain safe and are never consumed, degraded, or broken.
  - Star level and learned skills remain intact.
- **Success Rules**:
  - Star level increments by exactly 1.
  - Required duplicates and upgrade materials are consumed.
  - Correct skill slot unlocks are triggered (Slot 1 at Star 1, Slot 2 at Star 5).
  - Star growth stats are applied exactly once.
- **Clean duplicates prioritized**: Roster sacrifice selection automatically prioritizes clean copies before skilled copies.
- **Sacrifice warning**: If duplicate cards with learned special skills are selected for sacrifice, a confirmation warning modal blocks progression until approved.
- **Star growth repair**: `repairStarGrowth` resets player stats to templates and applies correct star growth stats on roster load, preventing double-boosting or base skill reassignments.
- **Cancel**: Canceling the upgrade consumes nothing.

## Skill Tape Economy — LOCKED STABLE
- Skill Tape is consumed when a reroll is generated.
- Keep Current does not refund Skill Tape.
- Economy is locked stable.

## UI Polish — LOCKED STABLE
- Global `font-mono` removed to eliminate slashed zeros across all numbers.
- Skill trigger rate numbers use clean sans-serif font.
- Trigger rate color is dynamic based on skill rarity.

---

## Hard Stops — Do Not Cross Without Approval
- Do not start new balance buffs until Phase SkillAudit-Final-1 is complete.
- Do not declare the skill system "complete" yet.
