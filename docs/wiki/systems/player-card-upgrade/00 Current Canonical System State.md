# Current Canonical System State

This is the single source of truth for the Player Card, Upgrade, and Skill systems.

---

## Player Model
`src/lib/types/player.ts` defines the player card: name, position, rarity, level, EXP, OVR, offense, defense, shooting, speed, strength, playmaking, stamina, salary, price, trend, detailed attributes, current-season stats, injury status, star level, base skills, special learned skill slots, skill rarities, and skill tiers.

## OVR
- OVR comes **only** from the NBA Data Pipeline (`players_update.json` → `mockPlayers.ts` → `nbaAttributeMapper.ts`).
- Star-up **does not** increase OVR.

## Star-Up
- Star-up only boosts gameplay attributes and unlocks Learned Skill slots.
- 25 total star levels across 5 tiers: Silver, Blue, Violet, Orange, Red (5 levels each).
- Learned Skill Slot 1 unlocks at Star 1.
- Learned Skill Slot 2 unlocks at Star 5.

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

## Learned Special Skills — LOCKED STABLE (Phase SkillAudit-Final-1)

> **15 legacy learned skills are active and officially locked stable as of Phase SkillAudit-Final-1.**
> See [[SkillAudit-Final-1 Base And Legacy Skill Status Lock]] for the full truth table.

- Rolling pool still returns legacy strings (e.g. `Red Dot X`, `Flop X`).
- Saved `specialSkillSlots` still store legacy strings.
- Rarity keys still use exact raw skill strings (e.g. `skillRarities["Red Dot X"]`).
- matchEngine now routes all legacy skills through mechanic adapters (`rollSpecialMechanic`, `hasSpecialSkillMechanic`).
- **New 15 family IDs are shadow-mode / architecture-ready only. They are NOT active in rolling.**
- Family-aware duplicate prevention is working.
- Flop is **protected** and must not be removed.

### Legacy Skill Status Table
| Skill | Status |
|---|---|
| Red Dot X | ✅ Active / Gated, Shooting archetype gated |
| Four-Point Bait X | ✅ Active / Gated, hybrid gated |
| Contact Tax X | ✅ Active / Gated, safely rebalanced |
| Lung Burner X | ✅ Active / Gated, safely rebalanced |
| Flop X | ⚠️ Active, counters added, archetype scaling blocked |
| Composure X | ✅ Active, counter only |
| Clean Contest X | ✅ Active, counter only |
| Dead Air X | ✅ Active / Preserved |
| Cage Step X | 📦 Active / Preserved |
| Corner Trap X | 📦 Active / Preserved, with bench-cleansing mismatch |
| Five-Man Squeeze X | 📦 Active / Preserved |
| Pressure Coach X | 📦 Active / Preserved |
| Chain Pass X | 📦 Active / Preserved |
| Cold Timeout X / Timeout Reset | ✅ Active / Preserved |
| Debt Collector X | ✅ Active / Preserved |

### ⚠️ What is NOT done yet
- No native 15-family rolling pool is active. The 15 families are connection-ready but blocked.
- UI changes for families (no icons or texts in standard menus yet).

### Final 15 Skill Family Targets (architecture-ready only)
| Category | Families |
|---|---|
| **Offense** | DEEP_STRIKE, COURT_VISION_ENGINE, POSTER_SPARK, FLOP, BROKEN_PLAY_RESCUE |
| **Defense** | SKY_WALL, LOCK_CHAIN, DEFENSIVE_ANCHOR, CLEAN_CHALLENGE, GLASS_STRIKE |
| **Comprehensive** | BENCH_CAPTAIN, MOMENTUM_SWING, COMPOSURE_SHIELD, GAMEPLAN_JAMMER, TIMEOUT_RESET |

This replaces the old 15 legacy skill pool. It is **not** adding 15 extra permanent skills.

### New Family Skills — Connection Status
| Family | Status |
|---|---|
| DEFENSIVE_ANCHOR | ✅ Connected |
| COURT_VISION_ENGINE | ✅ Connected |
| BENCH_CAPTAIN | ✅ Connected |
| LOCK_CHAIN | ✅ Connected |
| SKY_WALL | ✅ Connected |
| GLASS_STRIKE | ✅ Connected |
| POSTER_SPARK | ❌ BLOCKED — audited, intentionally not implemented |
| GAMEPLAN_JAMMER | ❌ BLOCKED — audited/regressed, intentionally not implemented |
| Others | ⏳ Not yet connected |

---

## Lineup Archetypes — GAMEPLAY-CONNECTED, NOT FINAL-LOCKED
| Archetype | Status |
|---|---|
| Stamina Drain | ✅ Connected and stable |
| Foul-Draw / Flop | ⚠️ Baseline active, counters active, scaling blocked |
| Glass Bully / Rebound | ✅ Connected with GLASS_STRIKE |
| Light Bulb / Playmaking | ✅ Connected with COURT_VISION + BENCH_CAPTAIN gating |
| Deep Strike / Shooting | ✅ Connected with Red Dot + Four-Point Bait hybrid gating |
| Paint Bully | ✅ Baseline tested; Contact Tax / Lung Burner rebalanced; POSTER_SPARK blocked |
| Anti-Meta / Gameplan | ✅ Baseline active; Dead Air X active; GAMEPLAN_JAMMER blocked |

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
- ❌ Do not enable new family rolling pool yet.
- ❌ Do not implement POSTER_SPARK.
- ❌ Do not implement GAMEPLAN_JAMMER.
- ❌ Do not start new balance buffs until Phase SkillAudit-Final-1 is complete.
- ❌ Do not declare the skill system "complete" yet.
