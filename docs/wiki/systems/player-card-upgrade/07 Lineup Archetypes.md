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

## 5. Deferred Balance Items (Future Work)

The following balance-sensitive mechanics are deferred and will not have any active gameplay integration until full gameplay balance audits are performed:
* **DEFENSIVE_ANCHOR team-wide drain:** Scaling of stamina drain and cooldown bounds remains deferred (hard cap remains fixed at 20 stamina).
* **FLOP / Foul-Draw scaling:** contact foul draw rates and SGA-specific multipliers.
* **POSTER_SPARK & GLASS_STRIKE:** Native mechanic implementations.
* **Base Skill Multipliers:** Base skill effect multipliers are deferred to protect core simulation stability.
