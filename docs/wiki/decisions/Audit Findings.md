# Audit Findings

Related pages: [[wiki/systems/Full Project Audit|Full Project Audit]], [[wiki/systems/Project Architecture|Project Architecture]], [[wiki/systems/Match Simulation Analysis|Match Simulation Analysis]].

## Confirmed Build Errors

Running `npx tsc --noEmit --pretty false` currently fails with:

- `src/app/page.tsx`: `refreshFreeAgents` is passed directly to a button click handler even though its parameter is an optional boolean, not a click event.
- `src/app/player/page.tsx`: `p.team` is used in search, but `Player` has no `team` property.
- `src/lib/context/GameStateContext.tsx`: context interface types `setLineupSlot(position: string, ...)`, while implementation expects `PlayerPosition`.

## Gameplay And Data Findings

- AI base skills are assigned and can trigger.
- AI special learned skills are assigned but effectively locked because AI players have no `starLevel`, and special slots require star level 1 or 5.
- Slot 3 base skill lock is implemented by OVR: below 85 it is visible but inactive and does not count toward synergy.
- Star-up preserves OVR and increases attributes.
- Player attributes are not capped by a max attribute value in the star growth formula.
- The update snapshot has 1174 player rows, but the active mock player pool starts from 23 literal base players.
- Draft and free-agent systems do not use all 1174 update rows.
- NBA.com live fetching is not present in the runtime code. I could not confirm this from the code.
- `generatePreMatchInjuries` currently returns healthy statuses. I could not confirm random pre-match injuries from the code.

## Mechanics That Exist But Look Underused

- `disabledSkills`, `blockedSkills`, `skillUsedThisGame`, `flagrantFouls`, and `ejectedPlayers` exist in state/types, but I could not confirm broad active gameplay use from the code.
- `applyEjection` exists inside match simulation but I could not confirm it is called.
- `newActiveSkillBuffs` is returned but I could not confirm it is populated.
- Stadium lab effect is described in UI/structure, but I could not confirm direct match-engine use.

## UI And Asset Findings

- Skill art mapping is incomplete for all 22 base skills and 15 special learned skills.
- Some local assets referenced by UI were not found in the public file map, including `/newicons/*.webp` and `/avatar/avatar3.webp`.
- `PlayerHexProfileModal` may fail for relative player image paths because it does not use the same image fallback logic as `PlayerCard`.
- `Header.tsx` returns null and is currently inactive.
- Several files contain mojibake/corrupted display characters.

## Testing Gaps

Engine-focused scripts exist: `test-engine.ts` and `smoke-test.ts`. They check important simulation pieces, but I could not confirm automated coverage for full UI flows, card modals, lineup assignment UI, inventory UI, free-agent market UI, or match visual sequences.
