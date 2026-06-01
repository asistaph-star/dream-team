<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Agent Constraints
- NEVER run `git checkout`, `git reset`, `git restore`, or `git clean` to revert workspace changes.
- NEVER rename, copy over, or overwrite active source files using `.backup` or fallback files.
- If compile, lint, or type errors arise, troubleshoot and fix them inline inside the active files. Do not revert to previous states to resolve build issues.

# Architecture Guardrails

## Required workflow
1. Audit first.
2. Report exact files and line ranges.
3. Extract only one safe piece.
4. Run `npx tsc --noEmit`.
5. If TypeScript fails, fix only the related extraction issue.
6. Manually verify behavior.
7. Commit one phase.
8. Push only at stable milestones.
9. Update Obsidian only after stable milestones.
10. Never continue to the next phase without approval.

## Anti-rollback rules
- Do not rewrite a whole page from memory.
- Do not recreate old UI.
- Do not replace canonical components with copied JSX.
- Do not touch unrelated files during focused extraction.
- Do not "clean up" logic while extracting UI.
- Do not modify PlayerCard design unless the task is specifically PlayerCard.
- Do not touch GameStateContext, matchEngine, drag/drop, save/load, economy, inventory mutations, lineup mutations, or match runtime without an audit-only phase first.

## Risk rules

### Safe:
- visual constants
- presentational components
- repeated badges/tabs/panels
- static data arrays
- pure utilities

### Medium:
- feature page slimming
- local modal state
- display helpers
- local selection state

### Risky:
- hooks/runtime logic
- drag/drop
- timers
- save/load persistence
- inventory/economy mutations
- lineup mutations
- match simulation
- GameStateContext
- matchEngine

## Canonical component rule
If a shared UI/component exists, use it instead of duplicating JSX. Current canonical/shared components include:
- PlayerCard
- ItemCard
- SkillBadge
- SidebarTabs
- SkewedBadge
- DetailPanelShell
- match feature components
- lobby feature components
- player feature components
