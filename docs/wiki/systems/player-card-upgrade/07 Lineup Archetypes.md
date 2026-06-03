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

---

## 8. Flop / Foul-Draw Archetype Audit & Preview Lock (Phase LineupArchetype-1H2)

An in-depth gameplay and safety audit of the **Flop / Foul-Draw Lineup** archetype was conducted to assess the balance risks of scaling shooting foul rates, free throw attempts (FTA), and foul-out rates.

### Audit Findings & Current Gameplay Status
* **Status:** Gameplay scaling is **strictly deferred**. The Flop / Foul-Draw archetype remains in **UI/documentation preview mode only**.
* **No Gameplay Changes:** The match engine and foul logic remain 100% unchanged.
  * **Foul Chance Cap:** Remains at the baseline cap of `0.28` (no increase to `0.30`).
  * **SGA Flop Multiplier:** Remains protected at the baseline `0.08` (does not scale to `0.116`).
  * **Four-Point Bait X:** Remains at the baseline `+0.09` (does not scale to `+0.12`).
  * **Archetype Multipliers:** No Flop archetype multiplier or general foul rate increase is activated.
  * **Save Data & OVR:** No saved card mutations, no family rolling pool activations, and no OVR/star-up logic changes.

### Current Match Engine Behavior
* **Flop X (`FLOP_SELL_CONTACT`):** Triggers only when the defender is **Tilted**. Adds a baseline bonus (`0.04`, or `0.08` for SGA) to the shooting foul chance.
* **Four-Point Bait X (`DEEP_STRIKE_FOUR_POINT_BAIT`):** Triggers on 3PT attempts when the defender is **Exposed**.
* **Key Counters:** Four-Point Bait is actively mitigated by defensive counters: `COMPOSURE_SHIELD` (cancel/mitigation), `CLEAN_CHALLENGE`, and `Discipline Wall`.
* **Foul Magnet:** Adds foul pressure only when defender stamina is low.

### Future Design Direction
* **Roster Integration:** The Flop / Foul-Draw archetype must enhance a cohesive foul-draw roster rather than letting a single rerolled Flop skill define the full lineup. Full value must require active **Foul-Draw Base Skill** support (e.g., Foul Magnet, Power Driver, Tempo Surgeon, Mismatch Caller, Paint Magnet, Focus Lock, Complete Engine).
* **Hybrid Synergy:** Four-Point Bait should require hybrid synergy from both the **Deep Strike** (shooting) and **Foul-Draw** archetypes before unlocking any future scaled boosts.
* **Risk Controls:** Foul systems can trigger free throw explosions and foul-out abuse. Any future gameplay scaling will require targeted, multi-quarter foul simulations.

---

## 9. Flop / Foul-Draw Simulator Regression (Phase LineupArchetype-1H3)

To stress-test the baseline Flop / Foul-Draw ecosystem before any potential gameplay scaling, a multi-scenario regression simulation suite was executed. 

### Regression Findings & Baseline Strength
* **Foul-Draw / Flop Baseline is Strong:** Roster configurations stacking Foul-Draw base skills (e.g., `Foul Magnet`, `Power Driver`, `Paint Magnet`) naturally increase FTA to the **25–27** range, already near the warning threshold.
* **Warning & Danger Thresholds:**
  * **FTA Target:** `16–23` FTA per team.
  * **Warning Threshold:** `28+` FTA.
  * **Danger Threshold:** `35+` FTA.
  * *Status:* Some baseline scenarios naturally reached `25–27` FTA. Under heavy counter defensive pressure, the user team's average FTA reached **30.4**, entering the warning range. 
* **Flop X Triggers:** Remained low (`0.20` to `0.47` triggers per game) and strictly setup-dependent (requiring the defender to be `Tilted` via a `Contact Tax X` drive).
* **SGA Double Behavior:** SGA's double Flop X bonus (`0.08` instead of `0.04`) triggered correctly and safely under simulation, averaging `0.07` double triggers per game without inflating overall FTA.
* **Four-Point Bait X & Counters:** Four-Point Bait X triggers were successfully controlled and mitigated by existing counters. Under simulation, the AI's `Discipline Wall` base skill successfully neutralized the forced foul pressure (`0.07` average counter triggers).
* **Foul-out & Game Flow Health:** No players fouled out during the simulations. Steals, turnovers, and scoring averages remained well within healthy limits, proving that free throws do not dominate or break normal match flow under baseline rules.

### Balance Decision
* **Decision: Option B — Baseline is already high; add/verify counters before scaling.**
* **Gameplay Safeguard:** Because baseline FTA is already close to the warning threshold when Foul-Draw skills are stacked, **no gameplay scaling will be implemented**.
  * **Do NOT** increase the Gold cap to `0.30`.
  * **Do NOT** scale SGA's Flop bonus to `0.116`.
  * **Do NOT** scale Four-Point Bait X to `+0.12`.
  * **Do NOT** add Flop archetype multipliers or general foul rate increases.

---

## 10. Targeted Anti-Flop Counter Support (Phase LineupArchetype-1H5)

Before any future Flop/Foul-Draw gameplay scaling can be considered, targeted anti-Flop defensive counterplay was introduced to ensure Flop triggers are fair and can be actively mitigated by disciplined defensive matchups.

### New Anti-Flop Defensive Checks
When `FLOP_SELL_CONTACT` triggers and before the `flopBonus` is applied to the shooting foul chance, the match engine rolls defensive counters in the following priority order:

1. **Composure Shield (`COMPOSURE_SHIELD_CANCEL`):**
   * **Mechanic:** Hard counter. If successful, cancels the Flop X bonus completely (added bonus = `0`).
   * **Logging:** Logs that Composure Shield stayed disciplined and denied the sell-contact attempt.
   * **Constraints:** No extra shot penalty is added, and global Flop trigger rates are unchanged.
2. **Clean Challenge (`CLEAN_CHALLENGE_CONTEST`):**
   * **Mechanic:** Soft counter. Checked only if Composure Shield fails. If successful, reduces the Flop X bonus by 50% (added bonus = `flopBonus * 0.5`).
   * **Logging:** Logs that Clean Challenge absorbed the contact cleanly.
   * **Constraints:** Does not fully cancel the Flop bonus.

### Roster & Balance Safeguards
* **SGA Flop Base Unchanged:** Shai Gilgeous-Alexander's baseline double bonus (`0.08` instead of `0.04`) is unchanged but is now subject to the same counterplay checks.
* **Four-Point Bait & Foul Magnet:** Untouched.
* **Foul Rates & Caps:** Untouched.
* **No Gameplay Scaling:** Flop archetype gameplay scaling remains unapproved and blocked until more live match samples prove that FTA ranges are completely safe.

---

## 11. Post-Counter Foul-Draw Regression Lock (Phase LineupArchetype-1H6)

Following the activation of targeted anti-Flop counters, a post-counter regression simulation was run across all 8 match-simulation scenarios to audit the effectiveness of the counters, verify FTA control, and confirm game flow health.

### Post-Counter Regression Metrics

| Scenario | Combined Score | User / AI FTA | User / AI Fouls | Flop X Triggers (SGA Double) | Composure Cancels | Clean Reduces | Steals / Turnovers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline (No Archetype)** | 207.7 | 21.5 / 24.0 | 15.7 / 13.1 | 0.20 (0.00) | 0.00 | 0.00 | 12.5 / 24.7 |
| **2. Foul-Draw Lv.1 (Bronze)** | 200.0 | 24.3 / 23.3 | 15.7 / 15.6 | 0.20 (0.00) | 0.00 | 0.00 | 11.2 / 25.1 |
| **3. Foul-Draw Lv.2 (Silver)**| 190.1 | 24.9 / 23.7 | 16.5 / 15.9 | 0.53 (0.00) | 0.00 | 0.00 | 12.9 / 25.9 |
| **4. Foul-Draw Lv.3 (Gold)**  | 194.2 | 25.5 / 25.5 | 17.0 / 16.4 | 0.13 (0.00) | 0.00 | 0.00 | 10.4 / 24.0 |
| **5. SGA Flop Lineup**        | 195.1 | 24.4 / 24.1 | 16.1 / 16.1 | 0.67 (0.13) | 0.00 | 0.00 | 10.7 / 23.5 |
| **6. Four-Point Bait Lineup** | 200.7 | 23.9 / 28.0 | 17.4 / 15.4 | 0.00 (0.00) | 0.00 | 0.00 | 10.5 / 22.4 |
| **7. Hybrid Deep Strike**     | 208.8 | 22.8 / 22.1 | 14.8 / 15.3 | 0.27 (0.00) | 0.00 | 0.00 | 10.3 / 23.7 |
| **8. Counter Lineup**         | 162.4 | 26.9 / 25.7 | 16.8 / 17.2 | 0.20 (0.00) | 0.07 | 0.20 | 9.9 / 23.5 |

### Analysis and Conclusions

1. **Anti-Flop Counters are Effective:** In Scenario 8 (Counter Lineup), the introduction of Composure Shield (`0.07` average cancels) and Clean Challenge (`0.20` average reduces) successfully controlled the Flop X foul pressure.
2. **FTA Warning Mitigation:** In the Phase 1H3 baseline, the heavy counter matchup reached an average FTA of **30.4** for the user (entering the warning threshold). With anti-Flop counter mechanics active, the average user FTA in Scenario 8 dropped to **26.9**, bringing it safely below the `28+` warning mark.
3. **SGA Flop Remains Dangerous but Fair:** SGA's double Flop bonus remains active (`0.67` Flop triggers, `0.13` double SGA portions) but did not lead to any runaway FTA, stabilizing the SGA lineup at an average of `24.4` FTA.
4. **Foul-Draw Utility Preserved:** Foul-Draw lineups still feel highly distinct and useful, naturally elevated to `24.3–25.5` FTA under normal matchups compared to standard lineups.
5. **No Foul-Out Spams:** Average personal fouls remained steady around `13–17` per team, ensuring no players fouled out and normal game flow was preserved.
6. **No Offensive Collapse:** Defensive lineups successfully clamp scoring (Scenario 8 combined score of `162.4` under heavy lock pressure), while all other scenarios remained healthy and close to the `190–225` combined score target.

### Balance Status Lock
* **Status Decision: Option A — Anti-Flop counters are stable; lock 1H5/1H6 and keep Flop scaling blocked.**
* **Safeguard Enforcement:** Because baseline Foul-Draw is already strong, all future gameplay scaling for the Flop / Foul-Draw archetype remains blocked. Any changes to the Gold Flop cap, SGA Flop multipliers, or Four-Point Bait scaling will require a new separate approval phase.

---

## 12. Rebound Regression Simulator (Phase LineupArchetype-1I2)

To establish a baseline for the rebound, second-chance, and putback systems prior to any potential `GLASS_STRIKE` implementation, a multi-scenario rebound regression simulator was executed across 8 distinct lineup scenarios.

### Rebound Regression Metrics

| Scenario | Combined Score | User / AI Total REB | User / AI OREB / DREB | User / AI OREB Rate | Second-Chance Poss. (Pts) | Putback FG% (Make / Att) | Glass Touch Triggers | Paint Barrier Triggers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline Balanced** | 192.0 | 56.0 / 57.5 | 9.9-46.1 / 11.3-46.2 | 17.6% / 19.7% | 1.0 (0.4) | 16.0% (0.2 / 0.9) | 0.00 | 0.00 |
| **2. Glass Touch Heavy** | 196.0 | 59.8 / 54.9 | 11.6-48.1 / 12.3-42.6 | 21.5% / 20.4% | 1.4 (0.8) | 26.7% (0.3 / 1.2) | 0.32 | 0.00 |
| **3. Paint Barrier Counter** | 196.9 | 55.6 / 57.2 | 9.5-46.1 / 11.3-46.0 | 17.2% / 19.7% | 1.5 (0.7) | 23.3% (0.3 / 1.2) | 0.00 | 0.68 |
| **4. Glass Bully Lv.1** | 201.6 | 55.3 / 52.9 | 10.7-44.6 / 10.7-42.2 | 20.2% / 19.4% | 1.5 (0.6) | 20.7% (0.2 / 1.2) | 0.16 | 0.00 |
| **5. Glass Bully Lv.2** | 213.8 | 65.6 / 36.8 | 8.4-57.2 / 9.8-27.0 | 23.6% / 14.7% | 0.8 (0.2) | 8.0% (0.1 / 0.7) | 0.12 | 0.40 |
| **6. Glass Bully Lv.3** | 224.1 | 62.8 / 37.3 | 6.6-56.2 / 10.9-26.4 | 19.9% / 16.3% | 0.6 (0.3) | 12.0% (0.1 / 0.5) | 0.04 | 0.52 |
| **7. Bully vs Counter** | 216.5 | 61.0 / 38.9 | 6.4-54.6 / 11.6-27.3 | 19.1% / 17.5% | 1.0 (0.4) | 20.0% (0.2 / 0.9) | 0.00 | 0.80 |
| **8. Tired Bigs (30 Stam)** | 167.2 | 64.3 / 60.4 | 10.6-53.6 / 11.9-48.5 | 18.0% / 18.2% | 1.4 (0.5) | 20.7% (0.2 / 1.2) | 0.00 | 0.00 |

### Analysis and Conclusions

1. **Second-Chance Scoring does NOT Dominate:** In the baseline (Scenario 1), second-chance points average only `0.4` points per game, and even in the Glass Touch Heavy scenario, they remain under `1.0` point (`0.8` points). Putback efficiency remains low (`16.0%–26.7%`), preventing rebounds from inflating match scores.
2. **OREB Rates Remain Far Below Cap:** The offensive rebound rate ranges from `14.7%` to `23.6%` under all simulation scenarios, far below the engine's global OREB cap of `36%` (`0.36`).
3. **Glass Touch and Paint Barrier are Healthy:**
   - Stacked `Glass Touch` base skills raise the OREB rate from `17.6%` to `21.5%` (+3.9%).
   - Stacked `Paint Barrier` base skills reduce the opponent OREB rate from `17.6%` to `17.2%`.
4. **Iron Motor Stamina Protection:** Starters without stamina protections end Q4 exhausted (Scenario 1 user C/PF end at `6.6%`/`0.3%`). However, lineups carrying `Iron Motor` (Scenarios 4-7) successfully maintain high stamina, ending Q4 with `56.6%` to `85.3%` stamina on C/PF big men.
5. **No Infinite Rebound Loops:** The match engine's non-recursive putback structure successfully terminates all missed putbacks in DREBs, maintaining a stable possession count.

### Future Design Recommendation
* **Decision: Option A — Baseline is safe; design GLASS_STRIKE rebound-only effect.**
* Because second-chance points and OREB rates are extremely safe and far below warning/danger limits, it is safe to proceed in a future phase with a `GLASS_STRIKE` enhancer that boosts OREB chances and putback conversion rates, provided the global `0.36` cap and stamina guards remain strictly enforced.

---

## 13. GLASS_STRIKE Rebound-Only Integration (Phase LineupArchetype-1I4)

The Learned Special Skill `GLASS_STRIKE` is integrated directly with the pure `resolveLineupArchetypes` resolver to scale its efficiency based on the team's active **Glass Bully / Rebound Lineup** archetype level:

* **Level 0 (Inactive):**
  * `GLASS_STRIKE` does not activate.
  * No OREB boost.
  * No putback boost.
* **Level 1 (Bronze):**
  * OREB boost: `+0.015`.
  * Putback conversion boost: `0`.
  * OREB cap remains strictly `0.36`.
* **Level 2 (Silver):**
  * OREB boost: `+0.025`.
  * Putback conversion boost: `+0.010`.
  * OREB cap remains strictly `0.36`.
* **Level 3 (Gold):**
  * OREB boost: `+0.035`.
  * Putback conversion boost: `+0.015`.
  * OREB cap remains strictly `0.36`.

### Core Safety Rules & Safeguards
* **OREB Chance Cap Clamp:** The final offensive rebound chance is strictly clamped at `0.36` maximum at all levels.
* **Paint Barrier Counterplay:** Paint Barrier contest / suppression applies to the final rebound chance calculation.
* **No Stamina Drain:** No box-out stamina drain is added.
* **No Automatic Putback:** Second-chance conversions are not automatic; they still roll against the putback shot quality probability `fc2`.
* **No Recursive Rebound Loop:** Missed putbacks always result in defensive rebounds (DREBs) for the opposing team, preventing infinite loops.
* **No Natural Rolling:** `GLASS_STRIKE` does not roll naturally in the natural rolling pool (`SPECIAL_SKILL_NAMES` in `skillCatalog.ts`).
* **POSTER_SPARK:** Remains completely untouched.
* **No Saved Data / OVR Changes:** Saved data structure and ascension growth limits remain unchanged.
