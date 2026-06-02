# Full Project Audit

Status: code-reading snapshot on 2026-05-28.
Project audited: `C:\Users\Nhico\Documents\School\dream-team`.
Vault target: `C:\Users\Nhico\Documents\Project\G10K`.

No game code was changed during this audit. This page is the hub for the connected project understanding.

## Connected Pages

- [[wiki/systems/Project Architecture|Project Architecture]] - folders, entry points, configs, active runtime files, and reference artifacts.
- [[wiki/systems/Game State And Economy|Game State And Economy]] - persistence, roster, lineup, storage, draft, free agents, currency, equipment, stadium, rewards, and strategies.
- [[wiki/systems/Player Card And Upgrade Systems|Player Card And Upgrade Systems]] - player model, OVR rules, star-up, attributes, injuries, cards, and skill slots.
- [[wiki/systems/Skill System|Skill System]] - base skills, special learned skills, marks, slot rules, and counters.
- [[wiki/systems/Match Simulation Analysis|Match Simulation Analysis]] - match engine, stamina, AI, fouls, OT, shot meter, events, and skill wiring.
- [[wiki/systems/UI Flow Analysis|UI Flow Analysis]] - screens, modals, navigation, live match controls, and user flow.
- [[wiki/decisions/Audit Findings|Audit Findings]] - bugs, missing logic, confusing areas, and things I could not confirm from the code.

## Confirmed Gameplay Loop

1. The player enters the lobby at `/` with a stadium/court view, currencies, salary cap, lineup slots, bench slots, free-agent agent, coach strategies, and chat.
2. Roster data comes from `GameStateContext`, persisted in `localStorage` under `dream_team_save_v1`.
3. Players can be signed, drafted, fired, equipped, placed into lineup/reserves, and star-upped.
4. OVR is treated as a data-driven performance rating. Star-up does not change OVR; it increases attributes used by match logic and UI.
5. Match starts from `/match`, chooses difficulty, builds user/AI stamina/stats, calibrates injured starters, shows pre-match preview, then runs `simulateTick` every 1.5 seconds.
6. During a match the user can substitute, switch strategies, call timeout, use energy drinks, and view play-by-play/stats.
7. The match engine resolves possessions, stamina, fouls, free throws, shot meter, AI coaching, skills, marks, counters, overtime, and final result.
8. `finishMatch` pays account EXP, cash, materials, player EXP, and strategy EXP.

## Source Confidence

Confirmed from code: app structure, state persistence, economy functions, star-up OVR rule, skill slot unlocks, match tick wiring, match controls, and local TypeScript errors.

I could not confirm this from the code: a live NBA.com API fetch at runtime, database/API routes, networked multiplayer/alliance/chat, real random pre-match injuries, active ejection/flagrant mechanics, or full use of every stored match-state field.
