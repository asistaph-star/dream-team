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

---

## 14. COURT_VISION Archetype Gating Integration (Phase LineupArchetype-1J3c)

Phase LineupArchetype-1J3c integrated playmaking archetype-gated scaling for the `COURT_VISION_RHYTHM` mechanic inside the match engine:

* **Level 0 (None / No Light Bulb):**
  * scaleFn multiplier: `0.85`
  * Shot-quality cap: `0.015` (reduced from 0.020)
  * Purpose: Reduces the "accidental" Court Vision value for lineups that do not invest in a playmaking identity.
* **Level 1 (Bronze):**
  * scaleFn multiplier: `1.00`
  * Shot-quality cap: `0.020`
  * Purpose: Restores the current baseline gameplay behavior.
* **Level 2 (Silver):**
  * scaleFn multiplier: `1.05`
  * Shot-quality cap: `0.020`
  * Purpose: Slight trigger consistency improvement.
* **Level 3 (Gold):**
  * scaleFn multiplier: `1.10`
  * Shot-quality cap: `0.020`
  * Purpose: Best trigger consistency, but enforces a strict `0.020` cap to prevent 3PT% spikes.

### Core Rules & Safeguards
* **No Cap Increases:** No archetype level raises the shot-quality cap above `0.020`.
* **No Assist Logic Changes:** Assist chances and selection weights are unchanged.
* **ISO/Post ISO Blocking:** COURT_VISION is still completely blocked when Isolation or Post Isolation strategy is active.
* **ISO Auto-Switch Handling:** If Isolation automatically switches to Motion Offense because of stamina collapse, the attacking lineup's dynamic archetype level continues to control the multipliers and caps. A Level 0 lineup will strictly receive Level 0 modifiers.
* **BENCH_CAPTAIN / TIMEOUT_RESET:** Remain completely untouched.
* **No Saved Data / OVR Changes:** Saved data structure, player attributes, and player progression systems remain unchanged.

---

## 15. BENCH_CAPTAIN Archetype Gating (Phase LineupArchetype-1J4)

Phase LineupArchetype-1J4 integrated playmaking archetype-gated scaling for the `BENCH_CAPTAIN_STABILIZE` mechanic inside the match engine:

* **Level 0 (None / No Light Bulb):**
  * scaleFn multiplier: `0.85`
  * Stamina recovery cap: `8` (maximum `+8` stamina, once per quarter per team)
  * Purpose: Gentle tax on trigger consistency for non-playmaking rosters.
* **Level 1 (Bronze):**
  * scaleFn multiplier: `1.00`
  * Stamina recovery cap: `8`
  * Purpose: Restores current baseline behavior.
* **Level 2 (Silver):**
  * scaleFn multiplier: `1.05`
  * Stamina recovery cap: `8`
  * Purpose: Tiny trigger consistency improvement.
* **Level 3 (Gold):**
  * scaleFn multiplier: `1.10`
  * Stamina recovery cap: `8`
  * Purpose: Best trigger consistency, but recovery cap stays strictly capped at `8`.

### Core Rules & Safeguards
* **No Recovery Increases:** No archetype level raises the stamina recovery cap above `8`.
* **No Cooldown Weakening:** Once-per-quarter cooldown key checks and marking are fully preserved. Cooldown is only marked if a valid target is recovered and focus stabilized.
* **Targeting:** Target selection remains strictly on-court lowest-stamina player. Bench/reserve players are not targeted or recovered.
* **Form Focus Cap:** Form focus recovery stays capped at `+0.80%` and is only applied if the player is cold/tired.
* **No Stacking Loops:** Stacking recovery enhancers does not create stamina loops; overall team fatigue decays normally.
* **No Saved Data / OVR Changes:** Saved data structure, player attributes, and player progression systems remain unchanged.

---

## 16. Deep Strike Exposed Setup Gating (Phase LineupArchetype-1K3A)

Phase LineupArchetype-1K3A integrated shooting/Deep Strike archetype-gated scaling for the `DEEP_STRIKE_EXPOSE_SETUP` (Red Dot X) mechanic inside the match engine:

* **Level 0 (None / No Deep Strike):**
  * scaleFn multiplier: `0.85`
  * Purpose: Reduces the trigger consistency of the Exposed setup mark for teams that do not invest in a shooting/Deep Strike identity.
* **Level 1 (Bronze):**
  * scaleFn multiplier: `1.00`
  * Purpose: Restores the baseline trigger consistency.
* **Level 2 (Silver):**
  * scaleFn multiplier: `1.05`
  * Purpose: Slight trigger consistency improvement.
* **Level 3 (Gold):**
  * scaleFn multiplier: `1.10`
  * Purpose: Maximum trigger consistency.

### Core Rules & Safeguards
* **Exposed Duration:** The Exposed mark duration remains exactly `3` possessions at all levels.
* **Symmetry:** Both User and AI paths are fully symmetrical.
* **Four-Point Bait:** Four-Point Bait X is untouched and does not use archetype gating in this phase.
* **Foul Pressure:** Foul pressure and FTA logic are completely untouched.
* **3PT Additive Cap:** `MAX_3PT_POSITIVE_ADDITIVE_BONUS` remains strictly capped at `0.08`.
* **Arc Pressure Math:** Base skill math for Arc Pressure remains unchanged.
* **Saved Data & Progression:** Saved data structure, player attributes, OVR/star-up calculations, and progression systems remain completely unchanged.

---

## 17. Four-Point Bait Hybrid Gating Implementation (Phase LineupArchetype-1K3B3)

Phase LineupArchetype-1K3B3 implemented **Option B Hybrid Gating** for the `Four-Point Bait X` special mechanic boost inside the match engine:

* **Symmetrical Gating Integration:**
  * Symmetrically resolves lineup archetypes for both User and AI paths using `resolveLineupArchetypes`.
  * The foul-pressure boost added by `Four-Point Bait X` scales dynamically based on the active levels of the attacking team's **Deep Strike / Shooting** and **Flop / Foul-Draw** lineup archetypes.
* **Option B Scaling Rules:**
  * **Neither archetype active:** `+0.020` foul boost.
  * **Only Shooting OR only Foul-Draw active:** `+0.045` foul boost.
  * **Both Shooting and Foul-Draw active (Hybrid Synergy):** `+0.090` foul boost (baseline).
* **Defensive Counterplay & Safety Rules:**
  * **Exposed Requirement:** Remains strictly required (Four-Point Bait X only applies on 3PT attempts when the defender is marked as `Exposed`).
  * **Counters:** `Composure Shield`, `Clean Challenge`, and `Discipline Wall` still cancel the boost appropriately.
  * **Foul Chance Cap:** `MAX_SHOOTING_FOUL_CHANCE` remains strictly clamped at `0.28`.
  * **3PT Additive Cap:** `MAX_3PT_POSITIVE_ADDITIVE_BONUS` remains strictly capped at `0.08`.
* **Deferred & Untouched Components:**
  * **Asymmetries:** Stamina tracking on fouls and Discipline Wall scaling asymmetries between User/AI paths are intentionally deferred to a future cleanup phase.
  * **Red Dot / Exposed Setup:** Remains unchanged.
  * **Arc Pressure & Flop:** Remain unchanged.
  * **Saved Data & Progression:** Saved data structures, card attributes, progression, and OVR/star-up calculations remain unchanged.

---

## 18. User/AI Shooting Foul Symmetry Cleanup (Phase LineupArchetype-1K3C)

Phase LineupArchetype-1K3C resolved two specific User/AI asymmetries in the shooting foul sub-systems inside the match engine to ensure complete gameplay fairness:

* **Symmetrical Discipline Wall Scaling:**
  * **Fix:** The AI path originally used a flat, fixed `−0.03` shot-quality (SQ) penalty when Discipline Wall held off Four-Point Bait X. This has been updated to mirror the User path's dynamic, defense-rating-scaled formula.
  * **Formula:** `disciplineScale = 0.85 + (dwMaxRating / 100) * 0.30`, applying `aiSkillShotBonus -= 0.03 * disciplineScale`.
  * **Ratings Lookup:** Looks up active `Discipline Wall` holders in the defending `userLineup`, finding the maximum `getOnBallDefenseRating`. If no holders are found, it falls back to the primary defender or a baseline rating of 50.
* **Symmetrical Stamina Tracking on Fouls:**
  * **Fix:** The AI path's main possession shooting foul success branch was missing stamina tracking calls present on the User path.
  * **Tracking calls mirrored:** Added `trackShotStamina(scorer.id, shotType, is3PT, 'foul')` and `trackDefensiveStamina(primaryDefender, shotType, is3PT, 'foul')` into the AI shooting foul success execution block.
* **Core Safety Rules & Safeguards:**
  * **Four-Point Bait values:** Untouched.
  * **Exposed requirement & counters:** Untouched.
  * **Arc Pressure & Flop X:** Untouched.
  * **Foul chance cap:** `MAX_SHOOTING_FOUL_CHANCE` remains strictly `0.28`.
  * **3PT additive cap:** `MAX_3PT_POSITIVE_ADDITIVE_BONUS` remains strictly `0.08`.
  * **Saved data & progression:** Saved data structures, card attributes, progression, and OVR/star-up calculations remain completely unchanged.

---

## 19. Paint Bully Regression Simulator Baseline (Phase LineupArchetype-1L2)

Phase LineupArchetype-1L2 established the Paint Bully regression baseline using a dedicated simulation suite. The key results and parameters are documented below:

* **Paint Attempts:** Averaged roughly 50–62 per game per team.
* **Paint FG%:** Stayed stable around 25%–35% across various lineup matches.
* **Rim Protection and Blocks:** Rim Warden, SKY_WALL, and high block/strength defenders successfully suppressed paint scoring.
* **FTA Near Warning Range:** Stacked Paint Bully lineups naturally increase free throw attempts (FTA), with the Paint Bully Heavy lineup reaching 28.9 User FTA per game, already near the warning range.
* **Big-Man Stamina Collapse:** PF/C stamina can drop severely under heavy paint usage, with some configurations depleting to 0% by the end of Q4 without stamina protection skills like Iron Motor.
* **Legacy Contact Tax X / Lung Burner X Pressure:** Legacy physical-pressure values are too severe for future POSTER_SPARK migration. 
  * **Lung Burner X** triggered heavily in legacy stress testing, and its flat `110` (User) / `190` (AI) stamina drain is unsafe for the standard player stamina pool.
* **POSTER_SPARK Status:** Remains completely unimplemented and unmapped.
* **Next Steps Recommendation:** Recommended next phase is a legacy Contact Tax / Lung Burner rebalance audit before any POSTER_SPARK gameplay is introduced.

---

## 20. Contact Tax / Lung Burner Regression Baseline (Phase LineupArchetype-1L4)

Phase LineupArchetype-1L4 added a dedicated Contact Tax / Lung Burner regression baseline simulation suite. The key results are documented below:

* **Contact Tax Impact:** Contact Tax Only causes a complete collapse of defender stamina by Q2 (lowest defender stamina reached 0.0%). Zero-stamina events per game jumped from the baseline `2.40` to `13.80`.
* **Lung Burner Impact:** Lung Burner Only instantly zeroes out defenders on successful triggers due to its flat 110 stamina drain, causing zero-stamina events to jump to `14.12` per game.
* **Debt Stress Impact:** Debt Stress simulation confirmed that the legacy flat 190 stamina drain is extremely unsafe, resulting in over 22,000 total stamina drained by Lung Burner per game and instantly zeroing out defender stamina in Q1.
* **Stamina Zeroing Frequency:** Stacking both Contact Tax and Lung Burner causes defender stamina to collapse immediately, producing over **33.10 zero-stamina events** per game.
* **Foul-Draw Overlap:** Foul-Draw overlap configuration caused extremely high Flop X trigger rates (**102.1 triggers per game**) because Contact Tax applies the `Tilted` mark, which Flop X exploits to draw fouls.
* **Rim Protection Counterplay:** Rim Warden and SKY_WALL successfully countered shot attempts (Rim Warden averaging 312+ and SKY_WALL averaging 209+ contests/blocks), but they could not prevent defender stamina collapse.
* **Symmetry Check:** Symmetrical user vs AI matchups confirmed identical collapses on both sides, with zero-stamina events peaking at **44.27** per game.
* **Verdict:** Legacy drain values are extremely unsafe and must be rebalanced (reducing drains to safe, controlled, archetype-gated amounts) before any POSTER_SPARK migration.

---

## 21. Contact Tax / Lung Burner Safe Rebalance (Phase LineupArchetype-1L5)

Phase LineupArchetype-1L5 implemented a safe rebalance of the physical-pressure stamina drains for both **Contact Tax X** and **Lung Burner X** inside the match engine to replace unsafe legacy flat drains with Paint Bully archetype-gated and anti-snowball fatigue scaling.

All changes are fully symmetrical across both User and AI branches.

### Rebalance Specifications

#### Contact Tax X
* **Old Behavior:** Flat 45 stamina drain.
* **New Behavior (Gated by Paint Bully Archetype):**
  * Level 0 (None): **8** stamina
  * Level 1 (Bronze): **10** stamina
  * Level 2 (Silver): **11** stamina
  * Level 3 (Gold): **12** stamina
* **Anti-Snowball Scaling:**
  * Defender stamina $< 30\% \rightarrow$ final drain scaled by `0.30` (70% reduction, rounded).
  * Defender stamina $< 50\% \rightarrow$ final drain scaled by `0.60` (40% reduction, rounded).
  * Otherwise $\rightarrow$ full drain.
* **Trigger Conditions:** Remains restricted to non-3PT/interior drives where the defender's stamina is $< 65\%$. Still applies the `Tilted` mark for exactly 3 possessions with no direct foul or shot quality boosts.

#### Lung Burner X
* **Old Behavior:** Flat 110 stamina drain, or 190 stamina drain when defender has the Debt mark.
* **New Behavior (Gated by Paint Bully Archetype):**
  * Level 0 (None): **15** stamina
  * Level 1 (Bronze): **20** stamina
  * Level 2 (Silver): **30** stamina
  * Level 3 (Gold): **40** stamina
* **Debt Handling:** If the target defender has `Debt`, add **+10** stamina drain.
* **Hard Cap:** Pre-snowball final drain is hard-capped at **40** stamina.
* **Anti-Snowball Scaling:**
  * Defender stamina $< 30\% \rightarrow$ final drain scaled by `0.30` (70% reduction, rounded).
  * Defender stamina $< 50\% \rightarrow$ final drain scaled by `0.60` (40% reduction, rounded).
  * Otherwise $\rightarrow$ full drain.
* **Trigger Conditions:** Remains single-target only, triggered only on successful shots against marked defenders, with no team-wide drains, no automatic fouls, and no automatic scores.

### Regression Audit & System Safeguards
* **Zero-Stamina Events:** Regression simulator audits confirm that zero-stamina events dropped significantly compared to legacy baseline runs, restoring normal player stamina progression.
* **FTA Ranges:** Free Throw Attempts (FTA) remained safe and stable.
* **POSTER_SPARK:** Remains unimplemented and unmapped.
* **Core Integrity:** Saved card data structure and OVR/star-up calculations remain completely unchanged.

---

## 22. POSTER_SPARK Design Audit (Phase LineupArchetype-1L6)

Phase LineupArchetype-1L6 audited and mapped the design direction for the `POSTER_SPARK` learned special skill:

* **Current Code Integration:**
  * **Unmapped:** `POSTER_SPARK` is not mapped to any mechanics in `LEGACY_TO_MECHANIC_MAP` inside `skillMechanics.ts`.
  * **Missing Catalog Data:** Missing from `SPECIAL_SKILL_TEXT` and `SPECIAL_SKILL_RATES` in `skillCatalog.ts`.
  * **No Natural Rolling:** Excluded from `SPECIAL_SKILL_NAMES` since it does not end in `" X"`.
  * **Trigger Logic:** Cannot trigger in `matchEngine.ts`. The match engine checks for `POSTER_SPARK_CONTACT_TAX` and `POSTER_SPARK_LUNG_BURNER` which resolve through legacy strings (`Contact Tax X` and `Lung Burner X`).
  * **Enhancer Only:** Only listed as a candidate enhancer for `rebound` (Glass Bully) and `paint-bully` (Paint Bully) archetypes in `archetypes.ts`.
* **Legacy Compatibility:**
  * Legacy skills `"Contact Tax X"` and `"Lung Burner X"` continue to map to the `POSTER_SPARK` family via `LEGACY_TO_FAMILY_MAP` in `skillMigration.ts`, so old cards function safely with the rebalanced stamina values.
* **Future Design Direction (If Implemented Later):**
  * If implemented, `POSTER_SPARK` will reuse the safe 1L5 stamina values dynamically scaled by Paint Bully / Glass Bully level:
    * **Level 1 (Bronze):** Setup drains 10 (applies Tilted) | Payoff drains 20.
    * **Level 2 (Silver):** Setup drains 11 (applies Tilted) | Payoff drains 30.
    * **Level 3 (Gold):** Setup drains 12 (applies Tilted) | Payoff drains 40.
  * **Constraints:** Hard cap of 40 stamina drain, anti-snowball scaling, single-target only, no team-wide fatigue, and no automatic fouls or scores.
* **Final Verdict:** `POSTER_SPARK` remains unimplemented for now because the 1L5 rebalanced legacy skills already provide safe physical pressure. This allows collecting more match samples under the new balance before adding new rollable skills.
* **Next Steps:** Proceed to Phase LineupArchetype-1M — Anti-Meta / Gameplan Lineup Audit.

---

## 23. Anti-Meta / Gameplan Regression Simulator (Phase LineupArchetype-1M2)

Phase LineupArchetype-1M2 established the regression baseline for the **Anti-Meta / Gameplan Lineup** archetype using a dedicated simulation suite. The key results and architectural conclusions are documented below:

### Regression Findings & Baseline Strength
* **Anti-Meta Base Skills are Active and Strong:** Audits of the match engine and simulation runs confirmed that all 7 core candidate base skills are fully functional:
  * **Shadow Guard & Focus Lock:** Successfully suppress the opponent's `Arc Pressure` shooting bonus (scaling it down to minor values).
  * **Discipline Wall:** Contributes active counterplay against `Four-Point Bait X`, applying an on-ball defense-scaled shot-quality (SQ) penalty to neutralize bait tactics.
  * **Hands Active:** Increases defensive pressure, driving turnovers and team steals under pressure.
  * **Enforcer Lift:** Provides robust team-wide stamina recovery when fouls occur, helping defensive lineups stay fresh.
  * **Future Core:** Safely handles form recovery check-ins per quarter.
* **Dead Air X / GAMEPLAN_DEAD_AIR:** The legacy special skill `Dead Air X` is fully mapped and functional. In simulations, it triggers regularly (~35.5 times per match), applying the `Static` mark to block opposing special skill execution.
* **GAMEPLAN_JAMMER Status:**
  * **Blocked/Unimplemented/Unmapped:** `GAMEPLAN_JAMMER` is NOT mapped to any active mechanic ID in `LEGACY_TO_MECHANIC_MAP` and is not rollable in natural pools.
  * **Decision:** Keep `GAMEPLAN_JAMMER` blocked and unimplemented in the match engine for now. The regression results prove that current Anti-Meta base skills, in combination with legacy `Dead Air X` triggers, are already highly effective at countering archetype stacking. Adding further disruption mechanics like `GAMEPLAN_JAMMER` immediately could cause severe scoring collapses (combined scores in mirror matches dropped to 136.7 even without it).

### Recommendations & Next Steps
1. **Option B — Keep GAMEPLAN_JAMMER blocked for now:** The baseline Anti-Meta counters are already sufficient and stable.
2. **Next Phase Alternatives:**
   * **Alternative A:** Anti-Meta documentation lock.
   * **Alternative B:** matchEngine refactor planning (audit/design phase).
   * **Alternative C:** PlayerCard stamina bar fix as a separate UI phase.
