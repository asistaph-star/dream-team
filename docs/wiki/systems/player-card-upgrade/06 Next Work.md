# Next Work

## Current Status
- **Base Skills**: ✅ Locked stable
- **Upgrade System**: ✅ Locked stable
- **Lineup Archetypes**:
  - **Stamina Drain**: ✅ Connected and stable.
  - **Foul-Draw / Flop**: ✅ Baseline only, counters active, scaling blocked.
  - **Glass Bully / Rebound**: ✅ Connected with `GLASS_STRIKE`.
  - **Light Bulb / Playmaking**: ✅ Connected with `COURT_VISION` + `BENCH_CAPTAIN` gating.
  - **Deep Strike / Shooting**: ✅ Connected with `Red Dot` gating, `Four-Point Bait` hybrid gating, and shooting foul symmetry cleanup (Phase 1K3C).
  - **Paint Bully**: ✅ Baseline tested (Phase 1L2); `Contact Tax X` / `Lung Burner X` safely rebalanced (Phase 1L5). `POSTER_SPARK` audited but blocked/unimplemented (Phase 1L6).
- **Learned Skill Identity Scaling**: ✅ Locked stable
- **MatchEngine Mechanic Migration**: ✅ Locked stable
- **New Family Rolling Pool**: ❌ Not active yet

---

## Next Phase
**Phase LineupArchetype-1M — Anti-Meta / Gameplan Lineup Audit**

* **Goal**: Audit the candidate skills, enhancers, and counters for the Anti-Meta / Gameplan Lineup archetype.
* **Important Guidelines**:
  - Audit/design only first.
  - Do not edit gameplay code.
  - Do not implement `GAMEPLAN_JAMMER` yet.
  - Do not map new family IDs yet.
  - Do not change rolling pools.
  - Do not mutate saved data.
  - Do not change OVR/star-up logic.

---

## Activation Prerequisites
The new 15-family rolling pool will **not** be activated until:
1. All 15 native mechanics exist in the match engine.
2. `SPECIAL_SKILL_TEXT` has descriptions for all 15.
3. `SPECIAL_SKILL_RATES` has base rates for all 15.
4. UI/icons can handle all 15 (no broken images or missing text).
5. Reroll/duplicate prevention passes with new IDs.
6. Full balance regression passes (30+ matches).

---

## Workflow Rules
- **Batch safe/non-risky work together** (documentation, naming, type helpers, UI copy, icon mapping audits).
- **Isolate risky work** (matchEngine changes, stamina/foul/mark logic, rolling pool activation, save data migration, OVR/star-up changes).
- Stop before risky gameplay/balance changes and wait for approval.
