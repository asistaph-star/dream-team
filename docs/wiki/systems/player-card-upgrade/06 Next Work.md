# Next Work

## Current Status
- Base Skills: ✅ Locked stable
- Upgrade System: ✅ Locked stable
- Learned Skill Identity Scaling: ✅ Locked stable
- MatchEngine Mechanic Migration: ✅ Locked stable
- New Family Rolling Pool: ❌ Not active yet
- Native Mechanics for 15 Families: ⚠️ Batch A (3/15: `CLEAN_CHALLENGE`, `COMPOSURE_SHIELD`, `TIMEOUT_RESET`) mapped and supported natively; remaining 12 families pending.

## Next Phase
**Phase SpecialSkill-2B3 — Native Mechanics Batch B**

Implement native engine mechanics for the remaining safe counters / utility / offensive rhythm families in Batch 1:
- `BENCH_CAPTAIN`
- `COURT_VISION_ENGINE`

Followed by:
- Designing and implementing next batches of native family mechanics (Batches C-G).


## Activation Prerequisites
The new 15-family rolling pool will **not** be activated until:
1. All 15 native mechanics exist in the match engine.
2. `SPECIAL_SKILL_TEXT` has descriptions for all 15.
3. `SPECIAL_SKILL_RATES` has base rates for all 15.
4. UI/icons can handle all 15 (no broken images or missing text).
5. Reroll/duplicate prevention passes with new IDs.
6. Full balance regression passes (30+ matches).

## Workflow Rules
- **Batch safe/non-risky work together** (documentation, naming, type helpers, UI copy, icon mapping audits).
- **Isolate risky work** (matchEngine changes, stamina/foul/mark logic, rolling pool activation, save data migration, OVR/star-up changes).
- Stop before risky gameplay/balance changes and wait for approval.
