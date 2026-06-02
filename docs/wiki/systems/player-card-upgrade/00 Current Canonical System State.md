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

## Base Skills — LOCKED STABLE
- 22 base skills, each scaled through Player Identity helpers.
- 3 base skill slots per player (slot 3 locked until OVR ≥ 85).
- Assignment uses real NBA data via `assignBaseSkillsFromStats`.
- Base skill effects are behaviour-only; they never touch OVR, salary, or rarity.

## Learned Special Skills — IN MIGRATION
- 15 legacy learned skills currently active in the rolling pool.
- Rolling pool still returns legacy strings (e.g. `Red Dot X`, `Flop X`).
- Saved `specialSkillSlots` still store legacy strings.
- Rarity keys still use exact raw skill strings (e.g. `skillRarities["Red Dot X"]`).
- matchEngine now routes all legacy skills through mechanic adapters (`rollSpecialMechanic`, `hasSpecialSkillMechanic`).
- **New 15 family IDs are shadow-mode / architecture-ready only. They are NOT active in rolling.**
- Family-aware duplicate prevention is working.
- Flop is **protected** and must not be removed.

### Final 15 Skill Family Targets
| Category | Families |
|---|---|
| **Offense** | DEEP_STRIKE, COURT_VISION_ENGINE, POSTER_SPARK, FLOP, BROKEN_PLAY_RESCUE |
| **Defense** | SKY_WALL, LOCK_CHAIN, DEFENSIVE_ANCHOR, CLEAN_CHALLENGE, GLASS_STRIKE |
| **Comprehensive** | BENCH_CAPTAIN, MOMENTUM_SWING, COMPOSURE_SHIELD, GAMEPLAN_JAMMER, TIMEOUT_RESET |

This replaces the old 15 legacy skill pool. It is **not** adding 15 extra permanent skills.

## Upgrade System — LOCKED STABLE
- 20-total-duplicate matrix (1 original + 20 duplicates = 21 copies to fully max).
- Multi-duplicate backend consumption (Red ★4 and Red ★5 each require 2).
- Clean duplicates prioritized over learned-skill duplicates.
- Failure consumes materials only; duplicates stay safe.
- Success consumes exact selected duplicates.
- Learned Skill sacrifice warning before consuming invested cards.
- Cancel consumes nothing.

## Skill Tape Economy
- Skill Tape is consumed when a reroll is generated.
- Keep Current does not refund Skill Tape.
- Economy is locked stable.

## UI Polish
- Global `font-mono` removed to eliminate slashed zeros across all numbers.
- Skill trigger rate numbers use clean sans-serif font.
- Trigger rate color is dynamic based on skill rarity.
