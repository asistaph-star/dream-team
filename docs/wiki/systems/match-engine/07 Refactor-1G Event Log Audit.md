# Refactor-1G — Event Log Helper Audit

**Phase:** Refactor-1G
**Date:** 2026-06-04
**Type:** Audit and Design Phase Only — Code untouched

---

## Decision

Leave event logs and event generation inside [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) and [`src/lib/utils/matchNarrative.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchNarrative.ts) for now. **No code extraction was performed in this phase.**

---

## Reason for Decision

1. **RNG Coupling:**
   * `makeEvent()` calls `eid()`.
   * `eid()` invokes `Math.random()` to generate a unique string ID.
   * Several narrative helpers (e.g., `missText`, `clutchScoreText`, `fatigueNarrative`) call `Math.random()` to pick random text variations from a pool.
   * Moving event creation, altering call ordering, or deleting logs will change the number and sequence of `Math.random()` calls, which would directly desynchronize the simulation's deterministic RNG seed.

2. **Gameplay State Side-Effects (`eventIndicator`):**
   * The `eventIndicator` variable is not merely UI metadata.
   * It is mutated throughout the play resolution loop and evaluated at the end of each possession tick to apply player action stamina costs (`applyActionStaminaCost`).
   * It is evaluated to reset the possession shot clock (`const isOreb = eventIndicator?.type === 'OREB'`).
   * Moving or altering `eventIndicator` assignments poses a high risk of breaking core stamina and clock rules.

3. **UI Integration:**
   * The UI parses event text patterns (e.g., checking if `text.toLowerCase().includes('misses')`) to trigger card animations (active highlight, missed visual flash).
   * Changing event payload shapes or text formatting would break UI-side logic.

4. **Visible Match Timeline:**
   * Event order in the array directly dictates the visual feed presented to the user.

---

## Documented Event Risks

* `newEvents.push` mutates local state.
* `skillLog` mutates `newEvents`.
* `eventIndicator` drives gameplay-side mutations.
* Event order affects the play-by-play visual timeline.
* Event creation consumes active RNG.
* Event extraction requires golden snapshot tests first.

---

## Blocked Extraction Scope

* Do not create `eventLogSystem.ts`.
* Do not move `skillLog` out of the engine.
* Do not move `newEvents.push` out of the engine.
* Do not move `makeEvent` or `eid`.
* Do not move `eventIndicator` handling.
* Do not alter event text or payload shapes.

---

## Future Requirement: Golden Event Snapshot Tests

Before any future extraction of event log code is attempted, we must implement deterministic snapshot tests verifying:
* Fixed match setups.
* A deterministic mock/seed for `Math.random()`.
* Exact event count and order snapshot.
* Exact event text verification.
* `activePlayerId` and `eventIndicator` side-effect parity.
* Score, stamina decay, and shot clock alignment.
