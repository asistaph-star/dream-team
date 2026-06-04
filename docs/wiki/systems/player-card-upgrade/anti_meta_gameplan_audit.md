# Audit and Design: Phase LineupArchetype-1M — Anti-Meta / Gameplan Lineup Audit

This document details the audit of the **Anti-Meta / Gameplan Lineup** archetype, analyzes the current state of its candidate base skills and special enhancers, and designs how it should counter over-stacked archetype strategies without deleting player identity or disrupting core match balance.

---

## 1. Current Anti-Meta Base Skill Map

We audited the 7 candidate skills for the Anti-Meta / Gameplan Lineup inside the match engine:

| Base Skill | Classification | Current Match Engine Effect |
| :--- | :--- | :--- |
| **Shadow Guard** | **Active** | Non-3PT/3PT contest check: If rolled, it suppresses the shooter's `Arc Pressure` bonus, reducing it to `0.015 / shadowScale` instead of `0.035 * arcScale`. |
| **Discipline Wall** | **Active** | Symmetrical foul check: If rolled, it counters the shooter's `Four-Point Bait X` boost, applying a defensive shot-quality adjustment of `-0.03 * disciplineScale` (scaled by defender defense rating). |
| **Focus Lock** | **Active** | Non-3PT/3PT contest check: If rolled, it suppresses `Arc Pressure`'s shooting bonus, reducing it to `0.02 / focusScale` instead of `0.035 * arcScale`. |
| **Hands Active** | **Active** | Defensive steal check: If rolled, it multiplies the opponent's turnover rate by `1.18 * handsActiveScale`, increasing the team steal frequency. |
| **Tempo Switch** | **Active** | Transition offense check: If rolled during a `fastbreak` or `early_offense` pace, it adds `+0.025` to `skillShotBonus`. |
| **Enforcer Lift** | **Active** | Team stamina check: If the team has committed fouls in the current quarter, rolls to recover `6 * enforcerLiftScale` stamina for the entire lineup. |
| **Future Core** | **Active** | Player form check: Every quarter tick, if the player's form rating is below `1.0`, it recovers/increases by `+0.006` (capped at `1.0`). |

* **Verdict**: All 7 candidate skills are **fully active** in `matchEngine.ts` and function exactly as cataloged.

---

## 2. Current Counter Systems Map

The Anti-Meta / Gameplan Lineup already possesses an active matrix of defensive counters:

* **Arc Pressure / Shooting**: Directly countered by `Shadow Guard` and `Focus Lock` (suppresses the shooting bonus).
* **Four-Point Bait**: Directly countered by `Discipline Wall` (reduces the foul-bait shot-quality boost).
* **Flop / Foul-Bait**: Cancelled by `Composure Shield` and reduced by 50% by `Clean Challenge`.
* **Defensive Anchor / Stamina Drain**: Mitigated by `Composure Shield` (composed leader check reduces team-wide drain).
* **Glass Strike / putbacks**: Indirectly countered by `Paint Barrier` (reduces team OREB chance by 6.0%).
* **Contact Tax / Lung Burner**: Stamina drains are countered by `Iron Motor` (reduces incoming drain by `0.65x`) and team-wide stamina recovery (`Enforcer Lift`).
* **Mark-based effects**: Cleanses marks (Exposed, Tilted, etc.) via `Timeout Reset` and prevents mark application via `Composure Shield`.

---

## 3. GAMEPLAN_JAMMER Current Status

* **`skillMechanics.ts` Mapping**: **No**. `GAMEPLAN_JAMMER` is a Special Skill Family ID, not an active mechanic ID. It is not mapped to any mechanics in `LEGACY_TO_MECHANIC_MAP`.
* **Catalog Rates & Text**: **Yes**. It has an entry in `SPECIAL_SKILL_TEXT` ("*Tactically blocks one opponent special skill trigger. Does not stack.*") and a base rate of `220` in `SPECIAL_SKILL_RATES`.
* **Natural Rolling**: **No**. It does not end with `" X"`, so it is filtered out of the natural rolling pool `SPECIAL_SKILL_NAMES`. Only the legacy skill `"Dead Air X"` can naturally roll.
* **Match Engine Triggering**: **No**. The engine rolls for `"GAMEPLAN_DEAD_AIR"` (which maps to legacy `"Dead Air X"`), not `"GAMEPLAN_JAMMER"`.
* **Legacy Mappings**: `"Dead Air X"` maps to `"GAMEPLAN_DEAD_AIR"` mechanic, and maps to the `"GAMEPLAN_JAMMER"` family in `skillMigration.ts`.
* **Archetype Enhancer**: Yes, only listed as an enhancer for `stamina-drain` and `gameplan` (Anti-Meta / Gameplan) archetypes in `archetypes.ts`.

---

## 4. Anti-Meta Future Role

The future design of the Anti-Meta Lineup must enforce **disruption over deletion**:
* **Trigger Consistency Disruption**: Temporarily reduces the trigger rates of opponent special skills rather than permanently silencing them.
* **Mark Resistance**: Cleanses or resists offensive marks (Exposed, Tilted, Debt) to break setup-to-payoff loops.
* **Stamina & Foul-Bait Resistance**: Boosts defensive stamina recovery and reduces shooting foul rates against bait strategies.
* **No Permanent Silence**: Players who invest in high-tier special cards must still feel their cards' impact; anti-meta should only check their efficiency.
* **Not the Best Universal Lineup**: A pure Anti-Meta lineup lacks offensive enhancers, making it vulnerable to well-rounded, high-stat rosters.

---

## 5. GAMEPLAN_JAMMER Design Options

* **Option A — Trigger Consistency Disruption**:
  * *Mechanic*: If rolled, `GAMEPLAN_JAMMER` slightly reduces the trigger consistency of the opponent's active special skills (e.g., scales down trigger rates by `0.80 / 0.70 / 0.60` depending on archetype level) for the current tick/possession.
  * *Analysis*: Safe and highly strategic.
* **Option B — Mark Resistance**:
  * *Mechanic*: `GAMEPLAN_JAMMER` grants a chance to resist mark application (Exposed, Tilted, etc.) or cleanses one mark at the start of a possession.
  * *Analysis*: Extremely clean and breaks archetype loops (like Contact Tax into Flop).
* **Option C — Archetype Suppression**:
  * *Mechanic*: `GAMEPLAN_JAMMER` suppresses the opponent's active archetype level (e.g., treating a Gold archetype as Silver).
  * *Analysis*: **High Risk**. Can cause cascading calculations and game-loop errors. Not recommended.
* **Option D — UI/Detection Only**:
  * *Mechanic*: Keep Anti-Meta as detection and passive base skill counters only.
  * *Analysis*: Safe and stable.

### Recommended Choice: Option D (UI/Detection Only) for now, leading into Option A/B Hybrid
* We should keep `GAMEPLAN_JAMMER` unimplemented in the match engine for now. The next best step is building a regression simulator to measure baseline performance of Anti-Meta base skills first.

---

## 6. Counterplay Safety

Anti-Meta lineups have built-in vulnerabilities:
* **Balanced Offensive Profiles**: Rosters with high base attributes (speed, strength, shooting) and standard offense can override anti-meta disruption.
* **Skill Diversity**: Rosters using a variety of different special skills rather than stacking a single archetype are less affected by targeted disruption.
* **Timeout Reset / Composure Shield**: Actively removes marks and counters defensive pressure.
* **Stamina Depth**: Utilizing bench substitutions offsets defensive stamina drains.

---

## 7. Safety Guardrails

Any future implementation of `GAMEPLAN_JAMMER` must guarantee:
1. **No Permanent Silence**: Opponent special skills must never be permanently disabled.
2. **No Total Trigger Shutdown**: Opponent trigger rates cannot be reduced to 0%.
3. **No Saved Data Mutations**: Card schemas, player stats, and inventory data must remain untouched.
4. **No OVR/Star-up Interactions**: Ratings calculations remain unaffected.
5. **No Broad Match Engine Rewrites**: Code changes must remain modular and isolated to the contest loops.

---

## 8. Recommendation & Next Steps

**A. Build Anti-Meta / Gameplan regression simulator first.**

* **Reasoning**: We need to establish a baseline of data for Anti-Meta matches (specifically how well the current base skills counter stacked Shooting, Foul-Draw, and Paint Bully teams) before we write any new code or active mappings for `GAMEPLAN_JAMMER`.

### Proposed Implementation Plan (If Approved Later):
1. **Phase 1M2 (Anti-Meta Regression Simulator)**:
   * Create `test_anti_meta_regression.ts` simulating:
     * Anti-Meta defense vs. Deep Strike (Shooting) offense.
     * Anti-Meta defense vs. Paint Bully offense.
     * Anti-Meta defense vs. Foul-Draw offense.
2. **Phase 1M3 (GAMEPLAN_JAMMER Gating Integration)**:
   * Map `GAMEPLAN_JAMMER` in `LEGACY_TO_MECHANIC_MAP`.
   * Add Anti-Meta level checks inside `matchEngine.ts` to scale `GAMEPLAN_DEAD_AIR` trigger rates and mark cleansing.
3. **Phase 1M4 (Post-Gating Regression Verification)**:
   * Run the regression suite to verify scoring averages, steal rates, and trigger stability.
