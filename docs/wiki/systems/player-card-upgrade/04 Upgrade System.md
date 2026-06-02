# Upgrade System

## Overview
The star-up (ascension) system lets players consume materials and duplicate cards to advance through 25 star levels across 5 tiers. The system is **locked stable** as of Phase UpgradeSystem-2C.

## Star Tiers
| Tier | Levels | Color |
|---|---|---|
| Silver | ★1 – ★5 | Silver |
| Blue | ★6 – ★10 | Blue |
| Violet | ★11 – ★15 | Violet |
| Orange | ★16 – ★20 | Orange |
| Red | ★21 – ★25 | Red |

## Duplicate Requirement Matrix
Canonical helper: `getRequiredDuplicateCount(tier, targetStarLevel)` in `src/lib/utils/starRequirements.ts`.

| Tier | ★1 | ★2 | ★3 | ★4 | ★5 | Total |
|---|---|---|---|---|---|---|
| Silver | 0 | 0 | 0 | 1 | 1 | **2** |
| Blue | 0 | 0 | 0 | 1 | 1 | **2** |
| Violet | 0 | 1 | 1 | 1 | 1 | **4** |
| Orange | 1 | 1 | 1 | 1 | 1 | **5** |
| Red | 1 | 1 | 1 | 2 | 2 | **7** |

**Grand total: 2 + 2 + 4 + 5 + 7 = 20 duplicates**
**1 original card + 20 duplicates = 21 total copies to fully max one player.**

## Backend Behavior (Phase UpgradeSystem-2A)
- Multi-duplicate consumption logic supports 0, 1, or 2 duplicates per upgrade.
- Red ★4 and Red ★5 each require 2 duplicate cards.
- **On success:** exact selected duplicates are removed.
- **On failure:** only materials are consumed; duplicates stay safe; base card stays safe.
- Base card is **never** consumed.

## Clean Duplicate Prioritization
- Clean duplicates (without Learned Skills) are selected before invested duplicates.
- This reduces accidental learned-skill sacrifice risk.

## Learned Skill Sacrifice Protection (Phase UpgradeSystem-2B)
- If selected duplicates include cards with Learned Skills, a warning modal appears.
- Warning displays: duplicate card name, learned skill name, slot number, rarity/tier.
- **Cancel:** clears warning, consumes nothing, changes nothing.
- **Confirm Sacrifice:** proceeds with the upgrade attempt.
- After confirmation: failure consumes materials only; success consumes exact selected duplicates.

## UI Behavior
- Duplicate requirement display shows: available / required.
- Duplicate box only appears when required count > 0.
- Red ★4 and Red ★5 show 2 required duplicates.
- Upgrade button disables when duplicates are insufficient.
- Warning modal text is clear and informative.

## UI Polish
- Global `font-mono` removed to eliminate slashed zeros from all numbers (including star-up metrics).
- Dynamic duplicate asset requirement box.
- OVR Diamond reactivity maintained.

## Stability Lock (Phase UpgradeSystem-2C)
- Full validation passed for all tiers and levels.
- Failure safety confirmed. Success consumption confirmed.
- Clean-first prioritization confirmed.
- Sacrifice warning flow confirmed.
- Learned slot unlocks confirmed (Slot 1 at Star 1, Slot 2 at Star 5).
- **Upgrade System is officially locked stable.**

## Core Rules
- OVR comes only from the NBA Data Pipeline.
- Star-up **does not** increase OVR.
- Star-up only increases gameplay attributes and unlocks learned skill slots.
- Do not change the duplicate matrix unless a real economy issue appears.
- Do not change success rates or material costs without explicit approval.
