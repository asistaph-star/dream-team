# Learned Special Skills

## Overview
Each player has 2 special learned skill slots:
- Slot 1 unlocks at Star 1.
- Slot 2 unlocks at Star 5.

Learned skills are rolled using Skill Tape via the reroll system. The current rolling pool contains 15 legacy skill strings. A family-based replacement system is being built but is **not active in rolling yet**.

## Reroll System
- Skill Tape is consumed when the reroll is generated (not on accept).
- The player sees the new result and chooses: **Accept New** or **Keep Current**.
- Keep Current does not refund Skill Tape.
- Duplicate protection: a player cannot roll the same exact skill they already have, and cannot roll a skill from the same family as an equipped skill.

## Legacy Rolling Pool (Currently Active)
| # | Skill Name | Category |
|---|---|---|
| 1 | Red Dot X | Mark Setup |
| 2 | Four-Point Bait X | Foul Pressure |
| 3 | Lung Burner X | Stamina Punisher |
| 4 | Chain Pass X | Mark Setup |
| 5 | Debt Collector X | Stamina Punisher |
| 6 | Five-Man Squeeze X | Stamina Punisher |
| 7 | Cold Timeout X | Safe Counter |
| 8 | Dead Air X | Mark Setup |
| 9 | Clean Contest X | Safe Counter |
| 10 | Contact Tax X | Mark Setup |
| 11 | Cage Step X | Mark Setup |
| 12 | Corner Trap X | Mark Setup |
| 13 | Pressure Coach X | Stamina Punisher |
| 14 | Flop X | Foul Pressure |
| 15 | Composure X | Safe Counter |

## Identity Scaling by Category

### Safe Counters / Utility (Phase LearnedSkill-1E)
- Cold Timeout X, Composure X, Clean Contest X
- Scaled through: `getCalmRating`, `getOnBallDefenseRating`

### Mark Setup (Phase LearnedSkill-1F)
- Red Dot X, Chain Pass X, Cage Step X, Contact Tax X, Corner Trap X, Dead Air X
- Marks: Exposed, Debt, Hooked, Tilted, Pinned, Static
- Same-mark immunity, 2-mark cap, natural expiry

### Foul Pressure (Phase LearnedSkill-1H)
- Flop X, Four-Point Bait X
- Flop X: SGA-specific modifier (+8.0% vs normal +4.0%)
- Four-Point Bait X: requires Exposed mark on defender
- Counter chain: Composure → Clean Contest → Discipline Wall

### Stamina Punishers (Phase LearnedSkill-1I)
- Lung Burner X, Five-Man Squeeze X, Debt Collector X, Pressure Coach X
- Bounded drain amounts, debt interaction rules

## Stability Lock (Phase LearnedSkill-1J)
- Full 30-match regression passed.
- FTA stayed stable. No 3PT foul anomalies.
- No stamina collapse. No permanent mark loops.
- All 15 learned skills trigger at identity-appropriate rates.
- Rarity still matters for trigger chance scaling.

## Final 15 Family Targets (Shadow Mode)
These are the replacement families being designed. They are **not active in rolling yet**.

| Category | Family ID | Role |
|---|---|---|
| **Offense** | DEEP_STRIKE | 3PT pressure / 3+1 |
| | COURT_VISION_ENGINE | Team offense rhythm |
| | POSTER_SPARK | Poster finish / interior pressure |
| | FLOP | Foul draw / sell contact |
| | BROKEN_PLAY_RESCUE | Near-turnover rescue |
| **Defense** | SKY_WALL | Rim protection |
| | LOCK_CHAIN | Steal / handler disruption |
| | DEFENSIVE_ANCHOR | Team defense structure |
| | CLEAN_CHALLENGE | Foul-bait counter |
| | GLASS_STRIKE | Putback / second chance |
| **Comprehensive** | BENCH_CAPTAIN | Bench leadership / recovery |
| | MOMENTUM_SWING | Run stopper / possession swing |
| | COMPOSURE_SHIELD | Mental pressure counter |
| | GAMEPLAN_JAMMER | Skill disruption |
| | TIMEOUT_RESET | Cleanse / reset pressure |

**This replaces the old 15 legacy skill pool later. It is not adding 15 extra permanent skills.**

## Core Rules
- Flop is protected and must not be removed.
- Legacy skills remain for compatibility until migration is complete.
- New family IDs are NOT active in rolling.
- Saved `specialSkillSlots` still store legacy strings.
- Rarity keys still use exact raw skill strings.
