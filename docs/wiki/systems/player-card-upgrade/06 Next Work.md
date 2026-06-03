# Next Work

## Current Status
- Base Skills: ✅ Locked stable
- Upgrade System: ✅ Locked stable
- Learned Skill Identity Scaling: ✅ Locked stable
- MatchEngine Mechanic Migration: ✅ Locked stable
- New Family Rolling Pool: ❌ Not active yet
- Native Mechanics for 15 Families: ⚠️ Batch D (8/15: `CLEAN_CHALLENGE`, `COMPOSURE_SHIELD`, `TIMEOUT_RESET`, `COURT_VISION_ENGINE`, `BENCH_CAPTAIN`, `LOCK_CHAIN`, `SKY_WALL`, `DEFENSIVE_ANCHOR`) mapped and supported natively; remaining 7 families pending.

## Next Phase
**Phase SpecialSkill-2B6 — Native Mechanics Batch E**

Implement native engine mechanics for the next batch of Special Skill Family IDs, including `GLASS_STRIKE`, `MOMENTUM_SWING`, `FLOP`, etc.


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
