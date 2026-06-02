# UI Flow Analysis

Related pages: [[wiki/systems/Full Project Audit|Full Project Audit]], [[wiki/systems/Game State And Economy|Game State And Economy]], [[wiki/systems/Player Card And Upgrade Systems|Player Card And Upgrade Systems]].

## App Shell

`layout.tsx` wraps all pages with `GameStateProvider`, `MainContainer`, and `BottomNav`. `BottomNav` is hidden on `/`, `/match`, and `/player`.

`Header.tsx` currently returns null, so there is no active header UI.

## Lobby `/`

The lobby is the main team screen. It includes stadium background, currencies, salary cap, active lineup slots, bench slots, auto-lineup, coach strategies, free-agent market, player modal, and chat.

Lineup uses drag/drop and slot buttons through `setLineupSlot`. Out-of-position warning exists. Free agents refresh on a timer or manual refresh, with pity logic for high rarity.

## Match `/match`

The match page has four states: lobby, pre-match, simulating/halftime, and post-game.

Pre-match shows both starting lineups and readiness. Simulating view shows the court, player cards, scoreboard, stamina, event banners, play-by-play, stats table, shot meter, free throw sequence, and action buttons. Post-game shows result, rewards, leaders, score, and statistics modal.

## Player `/player`

The player page has Roster and Stock tabs, search, position filter, sort, storage expansion, player card grid, and lineup/reserve grouping.

Confirmed TypeScript issue: the search checks `p.team`, but `Player` has no `team` property.

## Inventory `/inventory`

Inventory has Materials, Equipment, and Crafting tabs. It can craft gear and upgrade selected gear. Some imported player/star-up modal logic appears unused or unreachable from the visible UI sections. Star-up is confirmed reachable from the lobby player modal.

## Shop `/shop`

Shop shows draft pack purchase buttons and uses `DraftRevealModal` after draft.

## Stadium `/stadium`

Stadium shows facilities, passive store cash, claim revenue, and upgrade controls.

## Article, Alliance, Task

`/article` is a static news page. `/alliance` and `/task` are placeholder pages saying the module is coming soon.

## Visual Effects

Confirmed visual systems include card hover tooltips, stamina bars, hot/cold icons, event banners, block animation toggle, shot meter arc, free throw animation, run overlays, post-game leader panels, and modal effects.

Several strings show mojibake encoding artifacts in source, such as corrupted dashes, symbols, and emojis. This is mostly cosmetic but can affect polish.
