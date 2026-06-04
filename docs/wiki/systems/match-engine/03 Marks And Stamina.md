# Marks and Stamina Mechanics

This page details the specifications, formulas, and constraints governing player stamina, action-level decay, skill-level drain scaling, and the 6 tactical marks.

---

## 1. The 6 Tactical Marks

Tactical marks are debuffs applied during possessions by special base or signature skill triggers. Players can hold a maximum of **two distinct marks** at any time.

| Mark | Duration | Source/Trigger | Mechanic / Consequence |
|---|---|---|---|
| **Exposed** | 2 possessions | DEEP_STRIKE (Red Dot X) | Increases shooter foul-draw rate on 3PT attempts. |
| **Debt** | 2 possessions | COURT_VISION (Chain Pass X) | Makes target vulnerable to secondary skill splash drains. |
| **Hooked** | 2 possessions | LOCK_CHAIN (Cage Step X) | Target ball handler loses **38 stamina** per possession. |
| **Pinned** | 2 possessions | DEFENSIVE_ANCHOR (Corner Trap) | Blocks active skill-based stamina recovery while on court. Cleared when subbed out. |
| **Static** | 2 possessions | GAMEPLAN_JAMMER (Dead Air X) | Blocks mid-air skill triggers and adds +0.5% contest. |
| **Tilted** | 3 possessions | POSTER_SPARK (Contact Tax) | Target loses **45 stamina** when attacked on interior drives. |

### Same-Mark Immunity Guardrail
To prevent abusive stacking loops:
* A player **cannot** have multiple copies of the same mark.
* If a skill re-applies a mark that is already active on the target, the duration of the existing mark is **refreshed** back to its default (e.g. 2 or 3 possessions) instead of stacking separate debuffs.

---

## 2. Normal Action Stamina Costs

Active players consume stamina whenever they participate in a possession. Normal action costs are calibrated at a **100-stamina baseline** and scale proportionally for starred cards.

### Baseline Action Costs (at 100 Max Stamina)
* **Touch / Involvement**: `0.45`
* **Made 3-Pointer**: `3.05`
* **Made 2-Pointer**: `2.55`
* **Missed Shot / Turnover**: `1.85`
* **Blocked Shot**: `2.45`
* **Assist**: `0.90`
* **Offensive Rebound**: `2.10`
* **Defensive Rebound**: `1.45`
* **Block**: `2.80`
* **Steal**: `1.80`
* **Personal Foul**: `0.80`
* **Defender Scored On**: `0.90`

### Max Stamina Action Scaling
To ensure high-OVR/starred cards do not remain completely immune to fatigue:
* Action costs scale with the card's maximum stamina up to a **1.45x maximum cap**.
* At `150+` max stamina, action costs scale (e.g., a made 3PT costs `4.42` absolute stamina instead of `3.05`).
* **Pace Modifiers**: Fastbreak involvements increase baseline stamina costs by `1.50x`. Early offense involvements increase costs by `1.20x`.

---

## 3. Skill-Level Stamina Drain Scaling

Stamina-drain skills (e.g., `Lung Burner X`, `Contact Tax X`) drain relative stamina to match the target's ascension level:
* **The Rule**: Stamina drains scale with the target's maximum stamina up to a **1.55x maximum cap**.
* **Formula Impact**: A base drain of `35` remains `35` against a standard `100-stamina` player, but scales up to **54** against a maxed `190-stamina` player. This prevents starred cards from outgrowing active drain strategies.

### Core Drain Values
* **Lung Burner X**: Drains `110` stamina (increases to `190` if target has a `Debt` mark).
* **Debt Collector X**: Splash drain of `45` to 2 additional marked players.
* **Five-Man Squeeze X**: Drains `40` stamina from all active opponents (`60` if 3+ are marked).
* **Pressure Coach X**: Drains `12` stamina from marked targets during triggers.
* **LOCK_CHAIN (Native)**: Drains `Math.min(12, Math.round(9 * scale))` stamina (range `8–11`, capped at `12`) from the turnover committer or shooter under on-ball pressure.
* **SKY_WALL (Native)**: Drains `Math.min(10, Math.round(7 * scale))` stamina (range `6–9`, capped at `10`) from the shooter only during close-range paint shot contests.
* **DEFENSIVE_ANCHOR (Native)**: Drains stamina during half-court possessions, gated by the defending team's active **Stamina Drain Lineup** archetype level:
  * **Level 0 (None / Inactive)**: Drains `Math.min(8, Math.round(6 * scale))` stamina (capped at `8`) from the primary ball-handler (determined by highest assist/handle average) only. Target receives natural stamina resistance and anti-snowball scaling. No team leadership resistance is applied.
  * **Level 1 (Bronze)**: Drains `Math.min(20, Math.round(15 * scale))` stamina (capped at `20`) from all 5 opposing players. Targets receive team leadership resistance, natural stamina resistance, and anti-snowball scaling.
  * **Level 2 (Silver)**: Same team-wide drain (capped at `20`), with a `1.15x` trigger consistency multiplier.
  * **Level 3 (Gold)**: Same team-wide drain (capped at `20`), with a `1.30x` trigger consistency multiplier.
  * *Guards & Cooldowns:* Skip on fastbreak. Separate User vs. AI once-per-quarter cooldowns apply, set only on successful application. No marks are applied.

---

## 4. Stamina Defense & Recovery Safeguards

* **Iron Motor Counter**: Players with the `Iron Motor` base skill (or whose active teammates have it) receive a flat **0.65x multiplier** to all stamina drains applied to them, reducing stamina damage significantly.
* **Cold Timeout Cleanse**: Cleanse triggers (e.g. `Cold Timeout X`) remove 1 mark from all marked active teammates and recover `12` stamina for 1-2 tired players, governed by a once-per-quarter team-wide cooldown.
