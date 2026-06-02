# Historical & Deprecated Notes

This file archives superseded decisions, retired naming conventions, and old phase reports that have been consolidated into the topic files. These are kept for historical context but are **not the current truth**.

---

## Deprecated: X / XR / XR-ULT Naming Convention
The early architecture considered naming skill tiers as X → XR → XR-ULT. This was **replaced** by the card era and skill tier system:
- **Card Eras:** Current → Prime → Legend
- **Skill Tiers:** Standard → Prime → Legacy → Signature

Superseded by Phase SpecialSkill-2A1.

---

## Deprecated: PEAK Card Era
An early iteration used "PEAK" as a card era name. This was **replaced** by "PRIME".

Superseded by Phase SpecialSkill-2A1.

---

## Deprecated: HANGTIME_FINISH Family
`HANGTIME_FINISH` was initially included in the offense family catalog. It was **replaced** by `FLOP` after deciding that Flop must remain as a distinct foul-draw family for SGA/Harden/Luka-type players.

Superseded by Phase SpecialSkill-2A10.5.

---

## Deprecated: Direct Activation of New Family IDs
Early plans considered activating the new 15 family IDs immediately after the mechanic adapter migration. The Phase 2A17 audit determined this was **unsafe** because:
- No native engine mechanics existed for the new IDs.
- No base rates, descriptions, or icons existed for the new IDs.
- Activation would create skills that do nothing and display poorly.

**Decision:** Keep legacy rolling pool until native mechanics are complete.

Superseded by Phase SpecialSkill-2A17.

---

## Archived Phase Reports

The detailed per-phase reports that were previously appended to the main note have been consolidated into the topic files:

- **Player Identity phases (1B through 1X):** Summarized in [[player-card-upgrade/01 Base Skills]]
- **Skill System phases (1B through 1Q):** Summarized in [[player-card-upgrade/01 Base Skills]]
- **Skill Assignment phases (1A, 1C):** Summarized in [[player-card-upgrade/01 Base Skills]]
- **Mark System phase (1B):** Summarized in [[player-card-upgrade/02 Learned Special Skills]]
- **Learned Skill phases (1B through 1J):** Summarized in [[player-card-upgrade/02 Learned Special Skills]]
- **Upgrade System phases (2A through 2C):** Summarized in [[player-card-upgrade/04 Upgrade System]]
- **Special Skill Architecture phases (2A1 through 2A17):** Summarized in [[player-card-upgrade/03 Special Skill Migration]]
- **Native Mechanics Design phase (2B1):** Summarized in [[player-card-upgrade/03 Special Skill Migration]]

The original detailed phase-by-phase reports remain available in the git history of `Player Card And Upgrade Systems.md` for reference.

---

## Deprecated: Legacy Skill System and Star-Up System Files
The old monolithic pages `wiki/systems/Skill System.md` and `wiki/systems/Star-Up System.md` were used in early development to track baseline facts. They have been fully archived and superseded by the structured `player-card-upgrade/` directory:
- **`Skill System.md`** has been split and consolidated into `01 Base Skills.md` and `02 Learned Special Skills.md`.
- **`Star-Up System.md`** has been split and consolidated into `04 Upgrade System.md`.
- Both original file locations have been converted to clear redirect/index notes to prevent breaking existing wiki links.

