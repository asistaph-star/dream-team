# Project Architecture

Related hubs: [[wiki/systems/Full Project Audit|Full Project Audit]], [[wiki/systems/Frontend Component Architecture|Frontend Component Architecture]], [[wiki/systems/player-card-upgrade/00 Current Canonical System State|Player Card and Upgrade Systems]], [[wiki/systems/match-engine/00 Current Match Engine State|Match Engine State]].

## Runtime

This is a Next.js app using `src/app` routes, React 19, Next 16, Tailwind 4, and local client-side state. The main provider is `src/lib/context/GameStateContext.tsx`.

No `src/app/api` folder or server database integration was found. I could not confirm this from the code: any backend API, database write, auth service, cloud save, or live server economy validation.

## Major Folders

- `src/app` - route pages and global app shell. Active pages include `/`, `/match`, `/player`, `/inventory`, `/shop`, `/stadium`, `/article`, `/alliance`, and `/task`.
- `src/components/layout` - bottom navigation, header placeholder, main layout sizing, and the `GameViewport` shared fullscreen court scaling shell.
- `src/components/player` - compact player card and detailed hex profile modal.
- `src/components/shop` - draft reveal modal.
- `src/lib/context` - central game state, persistence, roster, economy, lineup, equipment, stadium, strategy, and star-up actions.
- `src/lib/data` - mock players, player update snapshot, items, and injuries.
- `src/lib/skills` - base-skill assignment, skill catalog, marks, trigger resolver, and active slot rules.
- `src/lib/types` - player and item TypeScript models.
- `src/lib/utils` - NBA attribute mapping, star growth, shot engine, match types, match AI, match narrative, and match engine.
- `public` - images, backgrounds, skill art, player placeholder, UI assets.
- root scripts and scraped files - `extract.js`, `parse.js`, `scrape_dreamteam.js`, `scrape_imgs.js`, `page_full (1).html`, `stadium.html`, and `dreamteam_chunk801.js` are reference/scraper artifacts, not imported by the active Next app.

## Configs And Docs

- `package.json` defines `dev`, `build`, `start`, and `lint`. Dependencies include Next, React, lucide-react, and Tailwind.
- `tsconfig.json` uses strict TypeScript, module resolution `bundler`, and alias `@/*` to `src/*`.
- `AGENTS.md` warns that this Next.js version must be checked carefully before code changes.
- `README.md` is still the default create-next-app readme.
- `implementation_plan.md` is an older card-design implementation plan, not the current authoritative system spec.

## Active Entry Points

- `src/app/layout.tsx` wraps the app in `GameStateProvider`, `MainContainer`, and `BottomNav`.
- `src/app/page.tsx` is the main team/lobby/stadium screen (rendered within `GameViewport`).
- `src/app/match/page.tsx` is the live match center (rendered within `GameViewport`).

## Fullscreen Layout Architecture

The `GameViewport` component (`src/components/layout/GameViewport.tsx`) provides a unified, responsive fullscreen scaling shell for game boards (like the Lobby Stadium and the Match Court). 

- **Court Scaling**: It dynamically expands the logical dimensions (`logW`, `logH`) to exactly match the screen aspect ratio. This prevents letterboxing (black bars) on ultrawide monitors without stretching the court background.
- **Coordinate Offsets**: Because the logical width expands, elements pinned to the edges (like players with `left: 200px` or `right: 180px`) would naturally drift apart. `GameViewport` injects `--court-offset-x` and `--court-offset-y` CSS variables. When positioning elements on the court, wrap the coordinates in `calc(Npx + var(--court-offset-x))` to keep them perfectly anchored to the court markings.
- **HUD Layers**: Use the `hudOverlay` prop for UI elements (Scoreboard, Action Log, Sub Modal). The overlay natively fills the screen without scaling, preserving sharp text and correct DOM coordinates.
- **Drag clones**: Drag ghosts (like `GlobalDragOverlay`) bypass `GameViewport` scaling and rely on exact DOM pixel coordinates (`e.clientX`) to prevent drag-and-drop input lag.
- `src/lib/context/GameStateContext.tsx` owns almost all persistent gameplay state.
- `src/lib/utils/matchEngine.ts` owns match simulation.

## Asset Notes

Several code paths reference local assets that were not visible in the public file map, including `/newicons/*.webp` and `/avatar/avatar3.webp`. I could not confirm this from the code whether these are intentionally external, missing, or still planned.

## Lobby Page Decomposition — Phase B

### 1. Why we started
* `src/app/page.tsx` was the biggest mixed-responsibility route file.
* It had UI, state, drag/drop, free agent gacha, chat, coach modal, profile HUD, and strategy data mixed together.
* Goal was to clean the structure without breaking gameplay behavior.

### 2. What we extracted

**Phase B1 — Strategy Data**
* Moved lobby offense/defense strategy arrays into:
  `src/features/lobby/data/strategies.ts`

**Phase B2 — LobbyChat**
* Extracted chat UI into:
  `src/features/lobby/components/LobbyChat.tsx`
* Kept chat state and send logic in `page.tsx`.

**Phase B3 — CoachModal**
* Extracted coach/strategy upgrade modal into:
  `src/features/lobby/components/CoachModal.tsx`
* Kept upgrade logic and GameStateContext behavior unchanged.

**Phase B4 — LobbyProfileHUD**
* Extracted profile HUD, currencies, EXP, salary/team display into:
  `src/features/lobby/components/LobbyProfileHUD.tsx`
* Preserved absolute positioning and visual layout.

**Phase B5 — FreeAgentMarket**
* Extracted Free Agent Market UI into:
  `src/features/lobby/components/FreeAgentMarket.tsx`
* Kept persistent market/timer/economy logic in `page.tsx`.
* Localized only modal-only UI state like selected player and status message.
* Verified signing, refresh, currency checks, and roster additions still work.

**Phase B6-A — Remaining Lobby Audit**
* `src/app/page.tsx` is now around 682 lines.
* Remaining major areas:
  * court layout
  * bench/reserve panel
  * drag/drop engine
  * renderSlot helper
  * small widgets
* The page is now mostly a lobby controller instead of one giant mixed UI file.

### 3. What we intentionally did not touch
* court drag/drop engine
* lineup mutation logic
* GameStateContext
* PlayerCard
* match files
* lobby hooks/runtime logic
* economy mutation internals

### 4. Future rule
* Do not extract drag/drop or court logic casually.
* Next safe optional target later is `LobbyBenchPanel`.
* CourtLayout / drag-drop extraction must be treated as a risky phase and needs a clean Git checkpoint first.
* Continue using:
  1. audit first
  2. extract one safe piece
  3. run TypeScript
  4. manual verify
  5. commit
  6. push at stable milestones
  7. update Obsidian after stable milestones

## Phase C — Shared UI Component Abstraction

### 1. Why we started Phase C
* After Match and Lobby refactors, we started cleaning duplicated shared UI patterns.
* Goal was to improve structure without touching runtime logic, economy logic, drag/drop, GameStateContext, or match engine.

### 2. What was extracted

**Phase C1 — Shared Visual Constants**
* Created: `src/lib/constants/visuals.ts`
* Moved shared `lowPolyBg`.
* Updated: `src/app/inventory/page.tsx`, `src/app/player/page.tsx`, `src/components/player/BenchSelectModal.tsx`, `src/components/player/PlayerHexProfileModal.tsx`

**Phase C2 — SidebarTabs**
* Created: `src/components/shared/SidebarTabs.tsx`
* Reused in: `src/app/inventory/page.tsx`, `src/app/player/page.tsx`
* Preserved exact tab styling and behavior.

**Phase C3 — SkewedBadge**
* Created: `src/components/shared/SkewedBadge.tsx`
* Reused in: `src/app/player/page.tsx`, `src/app/page.tsx`
* Preserved STARTING, BENCH, DUPLICATE, and OOP/Tactical Alert visuals.

**Phase C4 — DetailPanelShell**
* Created: `src/components/shared/DetailPanelShell.tsx`
* Reused in: `src/app/inventory/page.tsx`
* Consolidated the repeated Materials, Equipment, and Crafting right-side detail panel layout.
* Kept all inventory math, upgrade/craft logic, requirements, and button handlers inside `inventory/page.tsx`.

**Phase C5-A — Inventory and Player Cleanup Audit**
* `src/app/inventory/page.tsx` is now around 419 lines.
* `src/app/player/page.tsx` is now around 348 lines.
* Remaining inventory logic is mostly item grids, detail panel slots, and upgrade/craft handlers.
* Remaining player logic is mostly player grid, filter modal, and filtering logic.

### 3. What we intentionally did not touch
* inventory mutation logic
* upgrade/craft math
* player/lineup mutation logic
* GameStateContext
* PlayerCard
* ItemCard
* drag/drop systems
* match files
* economy/shop logic

### 4. Future recommendation
* Phase D can focus on feature-specific modal extraction.
* Best next safe target later: `src/features/player/components/PlayerFilterModal.tsx`
* This should be treated as a new milestone, not part of Phase C.

### 5. Workflow rule
Keep using:
1. audit first
2. extract one safe piece
3. run `npx tsc --noEmit`
4. manually verify
5. commit
6. push at stable milestones
7. update Obsidian after stable milestones

## Phase D — Player Page Cleanup

### 1. Why we started Phase D
* After Phase C shared UI cleanup, `src/app/player/page.tsx` still had a large custom filter modal.
* The goal was to reduce the player route page while keeping PlayerCard, roster logic, and filtering behavior unchanged.

### 2. Phase D1-A — PlayerFilterModal Audit
* Audited the Player Filter Modal inside `src/app/player/page.tsx`.
* Found the modal was about 100+ lines.
* Confirmed it was mostly visual UI plus modal-local pending filter state.
* Decided it was safe to extract as a feature-specific component.

### 3. Phase D1-B — PlayerFilterModal Extraction
* Created: `src/features/player/components/PlayerFilterModal.tsx`
* Moved:
  * filter modal JSX
  * rarity/position/team option UI
  * pending rarity/position/team state
  * reset/confirm modal-local logic
* Kept inside `src/app/player/page.tsx`:
  * active filter state
  * roster filtering logic
  * player grid
  * quick rarity dropdown
  * PlayerCard rendering
  * GameStateContext usage

### 4. Phase D1-C — Post-cleanup Audit
* `src/app/player/page.tsx` is now around 235 lines.
* Remaining page responsibilities:
  * route shell
  * active filters
  * tab state
  * player grid mapping
  * quick rarity dropdown
  * PlayerFilterModal invocation
* The page is now clean enough and acts as a controller/orchestrator.

### 5. What we intentionally did not touch
* PlayerCard internals
* roster/lineup mutation logic
* GameStateContext
* drag/drop systems
* match files
* lobby files
* inventory files

### 6. Future optional cleanup
* PlayerGridItem could be extracted later, but it is not necessary now.
* PlayerPageHeader could be extracted later, but the page is already readable.
* Do not over-refactor small clean files.

### 7. Workflow rule reminder
Continue using:
1. audit first
2. extract one safe piece
3. run `npx tsc --noEmit`
4. manually verify
5. commit
6. push stable milestones
7. update Obsidian after milestones

## Project Architecture Guardrails

### Folder responsibility rules

`src/app`
* route files only
* thin route shells/controllers
* import feature screens/components
* no huge reusable UI blocks
* no static data arrays if they can live in feature data/constants

`src/features`
* feature-specific code
* allowed folders:
  * components
  * hooks
  * utils
  * constants
  * data
  * styles
  * types.ts

`src/components`
* reusable global UI only
* examples:
  * PlayerCard
  * ItemCard
  * SkillBadge
  * SidebarTabs
  * SkewedBadge
  * DetailPanelShell
  * shared modal shells/buttons/layout wrappers

`src/lib`
* shared global systems only
* context
* engine
* data
* global types
* pure utilities
* no route-specific JSX

### File responsibility rules

* Do not mix large JSX, useState/useEffect runtime logic, business mutations, static arrays, inline constants/styles, and repeated UI in one file.
* repeated visual JSX → component
* shared visual JSX → `src/components/shared`
* feature-specific visual JSX → `src/features/<feature>/components`
* static arrays/config → `src/features/<feature>/data` or `constants`
* pure calculations → `utils`
* large CSS/string styles → `styles`
* types → `types.ts`
* runtime hooks → extract only after audit and approval

## Deferred / Do Not Touch Yet Roadmap

From now on, whenever we postpone a risky item, add it to this Deferred / Do Not Touch Yet roadmap immediately after the milestone documentation. Include:
* item name
* status
* reason it was postponed
* what files/systems must not be touched
* safe future first step

### 1. PlayIntent active wiring
**Status:** postponed.
**Reason:**
* `src/lib/match/playIntent.ts` exists as taxonomy/metadata only.
* It is not imported by active gameplay.
* Active wiring into matchEngine is postponed because it touches timing, shot generation, quarter endings, shot clock caps, and narrative consistency.
**Future safe path:**
* E3-D: add `selectPlayIntent(...)` helper only.
* E3-E: use PlayIntent only for logging/background simulations.
* E3-F: let PlayIntent lightly affect timing only after 20+ match tests.
* E3-G: pass PlayIntent into shot generation/narrative only after timing stays stable.

### 2. Signature move timing
**Status:** postponed.
**Reason:**
* Current engine calculates `timeElapsed` before `generateShot(...)`.
* The engine does not know the final ShotType/signature move when clock burn happens.
* Signature move timing requires engine-order planning.
**Rule:**
* Do not make Euro Step, Stepback, Floater, Post Fade, etc. directly control possession time yet.
* Primary `PlayIntent` should drive timing later.
* SignatureMove/ShotType should remain flavor/narrative until safely wired.

### 3. GameStateContext refactor
**Status:** do not touch.
**Reason:**
* `GameStateContext.tsx` is the save-game engine.
* It controls roster, lineup, inventory, economy, crafting, upgrades, match rewards, season progress, and localStorage save/load.
**Safe future candidates only:**
* pure types
* pure helpers
* constants
* initial/default values
**Risky:**
* provider split
* persistence layer
* economy mutations
* lineup mutations
* finishMatch
* ascendPlayer
* upgrade/craft mutations

### 4. Match runtime hooks extraction
**Status:** postponed.
**Reason:**
* Runtime hooks control simulation tick, free throws, shot meter, shootout, stamina, substitution, match finish, and rewards.
**Rule:**
* Do not extract `useMatchEngine`, `useMatchDragDrop`, `useShotMeterSequence`, or similar hooks until a separate high-risk audit phase.

### 5. Lobby court / drag-drop extraction
**Status:** postponed.
**Reason:**
* Lobby court drag/drop relies on screen coordinates, DOM hit testing, lineup mutations, and ghost card behavior.
**Safe optional future target:**
* `LobbyBenchPanel`
**Risky:**
* `LobbyCourtLayout`
* drag/drop engine
* lineup slot mutation behavior

### 6. Match engine full refactor
**Status:** postponed.
**Reason:**
* Current possession timing is stable after Phase E2.
* Do not rewrite engine order casually.
* Do not touch end-of-quarter, shot clock, free throws, overtime, shootout, scoring, or stamina without audit.

### 7. Defensive strategy / IQ / stamina timing multipliers
**Status:** postponed.
**Reason:**
* These were intentionally skipped during possession timing calibration.
* Adding them could affect average possession length and final scores.
**Future rule:**
* Audit first.
* Add only one factor at a time.
* Run 20+ background simulated matches.

### 8. Player page optional extractions
**Status:** optional / not necessary now.
**Items:**
* `PlayerGridItem`
* `PlayerPageHeader`
**Reason:**
* `src/app/player/page.tsx` is already clean enough around 235 lines.
* Do not over-refactor small readable files.

### 9. Lobby optional extractions
**Status:** optional.
**Items:**
* `LobbyBenchPanel`
* small lobby widgets
**Reason:**
* Safe only if presentational.
* Do not touch drag/drop/court logic casually.

### 10. Lineup / bench duplicate logic
**Status:** future bug audit.
**Reason:**
* Known issues exist around duplicate player copies, IN LINEUP / IN BENCH display, same-name copies, and drag duplicate visuals.
**Future first step:**
* audit identity model first.
* Confirm whether player copies use unique instance IDs or only player names.
* Do not implement before audit.

### 11. Stamina smart behavior
**Status:** future gameplay audit.
**Reason:**
* Low stamina players should eventually avoid heavy actions and play safer.
* This affects scoring, substitutions, shot quality, and stamina balance.
**Future first step:**
* audit stamina costs and decision logic only.

> ### Lineup / Bench Duplicate Copy Fix
  
  #### 1. Problem
  * Duplicate player copies are allowed in owned roster/storage because they are required for star-up / ascend.
  * But active lineup/bench should only allow one active copy of the same player name.
  * Previously, the one-player active rule was enforced too late during derived lineup/reserve rendering.
  * This caused missing/ghost cards or duplicated logic in UI checks.
  
  #### 2. Solution
  * Filter out duplicate names inside Lineup/Bench Select Modal during the active player selection process.
  * Keep exact `id` instance checks strictly separate from general `name` duplicate checks.
  * Use `some(p => p.player.name === card.player.name && p.id !== card.id)` pattern instead of strict ID equality for duplicate logic.
  * Re-implemented UI states (STARTING, BENCH, ACTIVE CLONE, DUPLICATE) strictly based on this isolated instance vs duplicate logic.
  * Added custom NBA 2K styling on the custom tooltips and active chip states with specific HD CSS styling.
  * Added sorting logic to ALL tab to prioritize Starting Lineup -> Bench -> Available/Duplicates (ordered by OVR inside groups).
  * Added custom 2K-style geometry pointers globally to replace default mouse cursors, improving UI feel.
  
  #### 3. Star-up safety
  * `roster` ownership was not changed.
  * `ascendPlayer` was not touched.
  * duplicate cards are still owned.
  * duplicate cards remain available for star-up / ascend materials.
  * no duplicate card is deleted, consumed, or fired by this active assignment fix.
  
  #### 4. What was intentionally not touched
  * PlayerCard internals
  * star-up / ascend logic
  * roster ownership
  * matchEngine
  * PlayIntent
  * inventory
  * stamina
  * scoring
  
  #### 5. Future reminder
  * Use "active copy rule," not "delete duplicate rule."
  * Owned duplicates are allowed and required.
  * Active lineup/bench only controls who is currently assigned to play.

---

## matchEngine Refactor Deferred Items

The following systems remain inside `matchEngine.ts` and have not been extracted. Each is a future refactor target. Do not touch without an explicit audit phase and approval.

### 12. staminaSystem.ts — NOT EXTRACTED
**Status:** partial. `staminaConfig.ts` and `staminaDecay.ts` extracted (Refactor-1B/1D). Core system still in matchEngine.
**What remains inside matchEngine:**
* Action stamina cost processor
* Skill stamina drain interactions (Contact Tax, Lung Burner runtime)
* Bench Captain / Enforcer Lift / Timeout Reset recovery interactions
* Anti-snowball resistance scaling
* `trackShotStamina` and stamina mutation dispatch
**Future safe first step:** audit only. Identify which stamina helpers are pure formula vs mutation-coupled.

### 13. markSystem.ts — NOT EXTRACTED
**Status:** not started.
**What remains inside matchEngine:**
* Mark application (Exposed, Tilted, Debt, Hooked, Pinned, Static)
* Mark duration decay per possession
* Mark cleanse (Timeout Reset, Composure/Clean resistance)
* Same-mark immunity enforcement
**Future safe first step:** audit which mark helpers are pure (apply rules) vs mutation-coupled (write to `newSkillMarks`).

### 14. foulSystem.ts — NOT EXTRACTED
**Status:** not started.
**What remains inside matchEngine:**
* Shooting foul detection and resolution
* Flop X foul pressure / SGA special foul behavior
* Four-Point Bait hybrid foul boost
* Foul Magnet, Clean Challenge, Composure, Discipline Wall foul counters
* And-one logic, foul caps, foul committer selection
* Free throw sequence (`runFTSequence`)
* Foul-out logic
**Risk:** HIGH — deeply coupled to scoring, stats, form, possession flow, and event logs. Do not touch without dedicated audit.

### 15. reboundSystem.ts — IN AUDIT (Refactor-1E)
**Status:** audit complete. Pure formula extraction approved pending implementation.
**Safe to extract (Option A):**
* `REB_W` constant, `getPositionReboundWeight`, `calculateTeamReboundScore`, `getOffensiveReboundChance`, `calculateGlassScale`, `calculateBarrierScale`
**Must stay in matchEngine:**
* `pickRebounder` (contains Math.random())
* `awardReb` (mutates stats, form, actionWorkload)
* Full OREB/DREB/putback resolution branches
* fc2 putback formula and all RNG rolls
**Future safe first step:** implement Refactor-1E Option A only after approval.

### 16. shotResolution.ts — NOT EXTRACTED
**Status:** not started.
**What remains inside matchEngine:**
* Shot success calculation (fc / fc2)
* 2PT / 3PT / paint shot resolution branches
* Block interaction and defender contest logic
* Stamina and form multipliers on shots
* Arc Pressure, Court Vision rhythm boost, SKY_WALL contest
* Scoring update, FGM/FGA/TPM/TPA tracking
**Risk:** HIGH — all RNG rolls and scoring mutations are tightly coupled. Do not touch without dedicated audit phase.

### 17. specialSkillSystem.ts — NOT EXTRACTED
**Status:** not started.
**What remains inside matchEngine:**
* All `rollSpecialMechanic()` trigger call sites
* Dead Air X, Defensive Anchor, Lock Chain, Sky Wall, Glass Strike
* Court Vision, Bench Captain, Contact Tax, Lung Burner, Flop, Four-Point Bait
* Composure / Clean Challenge
* All User/AI mirrored skill trigger hooks
**Risk:** HIGH — mirrored User/AI branches, RNG order, and skill interaction order are critical.

### 18. eventLogSystem.ts — NOT EXTRACTED
**Status:** not started.
**What remains inside matchEngine:**
* `skillLog` closure and all call sites
* Match event creation (`makeEvent`)
* Play-by-play, trigger, foul, rebound, stamina, and mark messages
**Risk:** LOW-MEDIUM for pure helpers, but extracting `skillLog` requires touching nearly every skill block. Do not extract until other systems are stable.
