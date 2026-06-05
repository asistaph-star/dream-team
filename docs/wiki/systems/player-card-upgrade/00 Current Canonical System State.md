# Current Canonical System State

This is the single source of truth for the Player Card, Upgrade, and Skill systems.

---

## Player Model
`src/lib/types/player.ts` defines the player card: name, position, rarity, level, EXP, OVR, offense, defense, shooting, speed, strength, playmaking, stamina, salary, price, trend, detailed attributes, current-season stats, injury status, star level, base skills, special learned skill slots, skill rarities, and skill tiers.

## OVR
- OVR comes **only** from the NBA Data Pipeline (`players_update.json` ➔ `mockPlayers.ts` ➔ `nbaAttributeMapper.ts`).
- Star-up **does not** increase OVR. `applyStarGrowth` explicitly enforces `ovr: player.ovr`.
- Card rarity matches OVR brackets (Mythic: 95+, Legendary: 85-94, Epic: 75-84, Rare: 65-74, Common: <65).

## Star-Up
- Star-up only boosts gameplay attributes and unlocks Learned Skill slots.
- 25 total star levels across 5 tiers: Silver, Blue, Violet, Orange, Red (5 levels each).
- **Boost Values**:
  - Stamina: +2 per star level.
  - Detailed gameplay attributes (`threePt`, `twoPt`, `freeThrow`, `handle`, `assist`, `steal`, `block`, `rebound`, `onBall`, `calm`) and core sub-ratings (`shooting`, `playmaking`, `speed`, `strength`) are boosted by `attributeGain` matching the star's color tier:
    - Silver/Blue: +1 per star level
    - Violet: +2 per star level
    - Orange: +3 per star level
    - Red: +4 per star level
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

## Base Skills — LOCKED STABLE (Phase SkillAudit-Final-1)

> **22 base skills exist, are fully active, and are officially locked stable as of Phase SkillAudit-Final-1.**
> See [[SkillAudit-Final-1 Base And Legacy Skill Status Lock]] for the full truth table mapping execution logic.

- 22 base skills, each scaled through Player Identity helpers.
- 3 base skill slots per player (slot 3 locked until OVR ≥ 85).
- Assignment uses real NBA data via `assignBaseSkillsFromStats`.
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
| | POSTER_SPARK | Active / Rollable | POSTER_SPARK_LUNG_BURNER, POSTER_SPARK_CONTACT_TAX |
| | FLOP | Active / Rollable | FLOP_SELL_CONTACT (Protected SGA modifier preserved) |
| | BROKEN_PLAY_RESCUE | Active / Rollable | BROKEN_PLAY_RESCUE_SAVE |
| Defense | SKY_WALL | Active / Rollable | SKY_WALL_RIM_PRESSURE |
| | LOCK_CHAIN | Active / Rollable | LOCK_CHAIN_ON_BALL_PRESSURE, LOCK_CHAIN_CAGE_STEP |
| | DEFENSIVE_ANCHOR | Active / Rollable | DEFENSIVE_ANCHOR_TEAM_PRESSURE, DEFENSIVE_ANCHOR_CORNER_TRAP, DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE |
| | CLEAN_CHALLENGE | Active / Rollable | CLEAN_CHALLENGE_CONTEST |
| | GLASS_STRIKE | Active / Rollable | GLASS_STRIKE_REBOUND |
| Comprehensive | BENCH_CAPTAIN | Active / Rollable | BENCH_CAPTAIN_STABILIZE, GAMEPLAN_PRESSURE_COACH |
| | MOMENTUM_SWING | Active / Rollable | MOMENTUM_SWING_STABILIZE |
| | COMPOSURE_SHIELD | Active / Rollable | COMPOSURE_SHIELD_CANCEL |
| | GAMEPLAN_JAMMER | Active / Rollable | GAMEPLAN_DEAD_AIR, GAMEPLAN_DEBT_COLLECTOR |
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
Final balance audit: **not done** — blocked until skill audit lock and refactor safety work are done.

---

## Upgrade System — LOCKED STABLE
- 20-total-duplicate matrix (1 original + 20 duplicates = 21 copies to fully max).
- Multi-duplicate backend consumption (Red ★4 and Red ★5 each require 2).
- Clean duplicates prioritized over learned-skill duplicates.
- Failure consumes materials only; duplicates stay safe.
- Success consumes exact selected duplicates.
- Learned Skill sacrifice warning before consuming invested cards.
- Cancel consumes nothing.

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
