# Learned Special Skills

## Overview
Each player has 2 special learned skill slots:
- Slot 1 unlocks at Star 1.
- Slot 2 unlocks at Star 5.

Learned skills are rolled using Skill Tape via the reroll system. The learned skill system uses the **Special Skill Families** as the official rolling pool. Legacy `" X"` skills are deprecated and no longer rollable.

---

## Active Rolling Pool (15 Active Families)
The official learned skill rolling pool contains **15 active Special Skill Families**:

| Family ID | Category | Display Name | Core Mechanics Map |
|---|---|---|---|
| `DEEP_STRIKE` | Offense | Deep Strike | 3PT pressure moment, Exposed mark, and hybrid foul baiting. |
| `COURT_VISION_ENGINE` | Offense | Court Vision Engine | Rhythm assist passing bonuses, Debt mark setups. |
| `POSTER_SPARK` | Offense | Poster Spark | Power interior finishing, defender stamina drain, and Tilted mark setups. |
| `FLOP` | Offense | Flop | Contact foul drawing. SGA-specific modifier preserved. |
| `BROKEN_PLAY_RESCUE` | Offense | Broken Play Rescue | Intercepts turnovers and forces a penalized 2PT rescue shot. |
| `SKY_WALL` | Defense | Sky Wall | Vertical rim block pressure, shot quality reduction. |
| `LOCK_CHAIN` | Defense | Lock Chain | perimeter steal pressure, Hooked mark setups, handler stamina drain. |
| `DEFENSIVE_ANCHOR` | Defense | Defensive Anchor | Team half-court defensive pressure, Pinned mark setups. |
| `CLEAN_CHALLENGE` | Defense | Clean Challenge | Contest discipline, foul baiting counters. |
| `GLASS_STRIKE` | Defense | Glass Strike | Rebound crashed putback conversion. |
| `BENCH_CAPTAIN` | Comprehensive | Bench Captain | Rotation stamina recovery support, marked opponent acting drain. |
| `MOMENTUM_SWING` | Comprehensive | Momentum Swing | Team stamina/form recovery and momentum bump after defensive events. |
| `COMPOSURE_SHIELD` | Comprehensive | Composure Shield | Forced foul pressure cancels, mental pressure counter. |
| `GAMEPLAN_JAMMER` | Comprehensive | Gameplan Jammer | Mid-air skill interruption, Static mark setups, Debt-spreading drain. |
| `TIMEOUT_RESET` | Comprehensive | Timeout Reset | Team mark cleansing, clutch recovery. |

---


## Reroll System
- **Consumption:** Skill Tape is consumed when the reroll is generated (not when accepted).
- **Player Choices:** **Accept New** or **Keep Current**. Keep Current does not refund Skill Tape.
- **Duplicate Prevention:** A player cannot roll the same exact skill they already have, and cannot roll a skill from the same family as an equipped skill (e.g. if a player has a `DEEP_STRIKE` skill, they cannot roll another `DEEP_STRIKE` skill slot).

---

## Legacy Saved Data Migration
To preserve legacy compatibility, any legacy `" X"` skill encountered in player saved data is translated upon load (during roster normalization) into its target official family ID:

| Legacy Skill | Target Family ID | Display Name |
|---|---|---|
| Red Dot X | `DEEP_STRIKE` | Deep Strike |
| Four-Point Bait X | `DEEP_STRIKE` | Deep Strike |
| Chain Pass X | `COURT_VISION_ENGINE` | Court Vision Engine |
| Contact Tax X | `POSTER_SPARK` | Poster Spark |
| Lung Burner X | `POSTER_SPARK` | Poster Spark |
| Flop X | `FLOP` | Flop |
| Cage Step X | `LOCK_CHAIN` | Lock Chain |
| Corner Trap X | `DEFENSIVE_ANCHOR` | Defensive Anchor |
| Five-Man Squeeze X | `DEFENSIVE_ANCHOR` | Defensive Anchor |
| Clean Contest X | `CLEAN_CHALLENGE` | Clean Challenge |
| Composure X | `COMPOSURE_SHIELD` | Composure Shield |
| Cold Timeout X | `TIMEOUT_RESET` | Timeout Reset |
| Dead Air X | `GAMEPLAN_JAMMER` | Gameplan Jammer |
| Debt Collector X | `GAMEPLAN_JAMMER` | Gameplan Jammer |
| Pressure Coach X | `BENCH_CAPTAIN` | Bench Captain |

---

## Identity & Rarity Gating
* **Trigger Rates:** Rolled skill slots use standard quality rates (`Common` to `Legendary`) mapped from the family's base rate.
* **Separation:** Learned special skills are purely behavioral and never impact a player's OVR, base salary, or star-up ascension ranks.
