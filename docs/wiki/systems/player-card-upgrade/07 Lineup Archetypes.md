# Lineup Archetypes

Lineup Archetypes reward strategic roster construction by checking the starting 5 lineup's active **Base Skills** and identifying cohesive gameplay identities.

---

## 1. Core Architecture (Phase LineupArchetype-1C)

* **UI & Detection Only:** Phase LineupArchetype-1C implements detection logic and a glassmorphic strategy HUD in the main Lobby.
* **No Gameplay Buffs:** No gameplay math, active buffs, base skill multipliers, or matchEngine balance details are modified in this phase. Archetypes are strictly informational to help players assess roster synergy.

---

## 2. Activation and Level Rules

Archetypes are calculated dynamically based on **active Base Skill signals** from the starting 5 lineup:
* **Starting 5 Only:** Bench players and reserve cards do NOT contribute to archetype signals.
* **OVR < 85 Lock:** If a starting player's OVR is below 85, their third (Green/Comprehensive) base skill is locked/inactive and does NOT count toward signals.
* **Option B Level Thresholds:**
  * **Level 1 (Bronze):** Requires **3** matching active signals in the starting 5.
  * **Level 2 (Silver):** Requires **5** matching active signals in the starting 5.
  * **Level 3 (Gold):** Requires **7** matching active signals in the starting 5 **AND** at least **3 distinct players** contributing at least one signal.
* **Duplicates & Multi-Skill Contribution:**
  * Duplicate base skills across different players count.
  * One player can contribute multiple signals (e.g. if they have both Red and Green candidate skills active on their card).

---

## 3. The 7 Active Archetypes

| Archetype Name | Candidate Base Skills | Enhancer Learned Special Skills |
| :--- | :--- | :--- |
| **Stamina Drain Lineup** | Paint Magnet, Power Driver, Screen Breaker, Shadow Guard, Hands Active, Discipline Wall, Focus Lock, Iron Motor, Enforcer Lift | DEFENSIVE_ANCHOR, LOCK_CHAIN, SKY_WALL, GAMEPLAN_JAMMER |
| **Flop / Foul-Draw Lineup** | Foul Magnet, Power Driver, Tempo Surgeon, Mismatch Caller, Paint Magnet, Focus Lock, Complete Engine | FLOP, DEEP_STRIKE, COMPOSURE_SHIELD |
| **Light Bulb / Playmaking Lineup** | Tempo Surgeon, Connector Hub, Share Rhythm, Complete Engine, Tempo Switch, Position Flex, Future Core | COURT_VISION_ENGINE, BENCH_CAPTAIN, MOMENTUM_SWING, TIMEOUT_RESET |
| **Deep Strike / Shooting Lineup** | Arc Pressure, Tempo Surgeon, Mismatch Caller, Tempo Switch, Connector Hub, Complete Engine, Position Flex | DEEP_STRIKE, COURT_VISION_ENGINE, MOMENTUM_SWING |
| **Glass Bully / Rebound Lineup** | Glass Touch, Paint Barrier, Paint Magnet, Power Driver, Rim Warden, Iron Motor, Enforcer Lift | GLASS_STRIKE, POSTER_SPARK, SKY_WALL |
| **Paint Bully Lineup** | Paint Magnet, Power Driver, Mismatch Caller, Glass Touch, Rim Warden, Enforcer Lift, Iron Motor | POSTER_SPARK, FLOP, BROKEN_PLAY_RESCUE, SKY_WALL |
| **Anti-Meta / Gameplan Lineup** | Discipline Wall, Focus Lock, Shadow Guard, Screen Breaker, Complete Engine, Position Flex, Future Core | GAMEPLAN_JAMMER, COMPOSURE_SHIELD, CLEAN_CHALLENGE, TIMEOUT_RESET |

---

## 4. Special Skills as Enhancers (Not Creators)

The system relies on Base Skills to define the core roster identity. Learned Special Skills act as amplifiers of the active archetype:
* **Base Skills = Roster Identity:** Players must first build a roster with matching active Base Skills to unlock Level 1/2/3 tiers.
* **Special Skills = Amplifiers:** Learned Special Skills (e.g. `DEFENSIVE_ANCHOR`) are designed to scale their efficiency based on the active archetype level, rather than enabling the strategy alone.

---

## 5. Defensive Anchor Archetype-Gated Integration (Phase LineupArchetype-1F)

`DEFENSIVE_ANCHOR` (mapped to `DEFENSIVE_ANCHOR_TEAM_PRESSURE` with base rate `220`) is integrated directly with the pure `resolveLineupArchetypes` resolver to scale its efficiency and scope based on the team's active **Stamina Drain Lineup** archetype level:

* **Level 0 (None / Inactive):**
  * **Effect:** Single-target drain against the primary playmaker (the offensive player with the highest average of `assist` and `handle` ratings).
  * **Drain Formula:** `Math.min(8, Math.round(6 * scale))` (strictly capped at `8` stamina).
  * **Counterplay:** Attacking player's natural stamina resistance and anti-snowball low-stamina reduction apply. No team leadership resistance is applied.
* **Level 1 (Bronze):**
  * **Effect:** Team-wide drain against all 5 offensive opponents.
  * **Drain Formula:** `Math.min(20, Math.round(15 * scale))` (strictly capped at `20` stamina).
  * **Counterplay:** Full counterplays apply (team leadership resistance + target stamina resistance + anti-snowball reduction).
* **Level 2 (Silver):**
  * **Effect:** Team-wide drain (capped at `20` stamina).
  * **Trigger Consistency:** Boosted by a **1.15x trigger consistency multiplier** (effective rate `253`).
* **Level 3 (Gold):**
  * **Effect:** Team-wide drain (capped at `20` stamina).
  * **Trigger Consistency:** Boosted by a **1.30x trigger consistency multiplier** (effective rate `286`).

### Execution Guards & Constraints
* **Possession Guard:** Only the active defending team can trigger their Defensive Anchor. Both teams can never trigger in the same play.
* **Fastbreak Guard:** Skips immediately if `pace === "fastbreak"`.
* **Team-Specific Cooldowns:** Keys are tracked per team per quarter (`User Defensive Anchor Q[1-4]` / `AI Defensive Anchor Q[1-4]`) and are only set upon a successful roll and application of the drain.
* **No Marks:** `DEFENSIVE_ANCHOR` does not apply any marks (e.g. Pinned, Hooked, Static).

---

## 6. LineupArchetype-1G Balance Regression & Watch Items

Following the implementation of archetype-gated scaling, a rigorous regression test suite was executed across multiple match-simulation scenarios to audit engine stability, fatigue rates, trigger frequencies, and counterplay mechanics.

### Key Regression Findings
* **Stamina Stability:** Gated scaling prevents runaway fatigue. In Level 1-3 games, average team stamina remained healthy at **75–79%** by the end of Q4, and the lowest single-player stamina on court stayed around **59–63%**. No team experienced halftime stamina collapses.
* **Level 0 (None / Inactive) Safety:** Verified that Level 0 triggers execute as a safe single-target playmaker drain only, capping at `8` stamina, and never leak team-wide impact.
* **Counterplay Integrity:** Counterplay leader checks (`COMPOSURE_SHIELD_CANCEL`, etc.) successfully reduced the team-wide drain (e.g. by 20% against composing leaders) but did not erase the utility of the drain strategy.
* **Tactical Substitutions:** Auto-substitutions remain critical to rest fatigued players. Since archetypes are calculated dynamically from the active 5 players on court, **substitutions can temporarily weaken or disable an active archetype** if bench replacements do not carry matching base skill signals (e.g., slipping from Lv.1 to Lv.0). This supports deeper rotation planning and roster-building depth.
* **Pace & Possession Guards:** Trigger checks correctly ignored fastbreak pacing and enforced possession-side segregation (both teams cannot trigger on the same play). Legacy Cage Step X, Corner Trap X, Five-Man Squeeze X, Flop X, and SGA-specific Flop behavior remained fully untouched.

### Balance Watch Items
* **Scoring Metrics:** While combined scores remained mostly healthy within the `190–225` target range, one scenario reached slightly above at `231.9`.
* **Action:** No immediate tuning is required. We record this as a watch item: *"Monitor combined score and Defensive Anchor trigger frequency after more real match samples."*

### Recommendation & Status Lock
* **Current Status:** `DEFENSIVE_ANCHOR` is **locked as stable**.
* **Tuning Trigger Thresholds:** Future tuning will only be initiated if live match data displays:
  * Runaway stamina collapse (halftime depletion).
  * Persistent scoring spikes exceeding the 225-point threshold.
  * Over-frequency of Defensive Anchor triggers.
  * Substitutions becoming ineffective or useless.
  * Counterplay mechanics becoming too strong (erasing the drain) or too weak (zero mitigation).

---

## 7. Deferred Balance Items (Future Work)

The following balance-sensitive mechanics are deferred and will not have any active gameplay integration until full gameplay balance audits are performed:
* **FLOP / Foul-Draw scaling:** contact foul draw rates and SGA-specific multipliers.
* **POSTER_SPARK & GLASS_STRIKE:** Native mechanic implementations.
* **Base Skill Multipliers:** Base skill effect multipliers are deferred to protect core simulation stability.
