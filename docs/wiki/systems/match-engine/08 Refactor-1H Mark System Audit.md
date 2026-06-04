# Refactor-1H — Mark System Audit

**Phase:** Refactor-1H
**Date:** 2026-06-04
**Type:** Audit and Design Phase Only — Code untouched

---

## Decision

Leave the status mark system inside [`src/lib/utils/matchEngine.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) and [`src/lib/skills/skillResolver.ts`](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillResolver.ts) for now. **No code extraction was performed in this phase.**

---

## Reason for Decision

* **Existing Isolation:** The basic mark lookup and utility functions are already partly isolated in `skillResolver.ts` (e.g., `hasMark`, `addMark`).
* **Gameplay State Coupling:** Operations like `addMark`, `consumeMark`, `decayMarks`, and `removeOldestMark` directly manipulate the active simulation state map (`newSkillMarks` and `newMarkImmunity`).
* **Trigger and Log Synchronization:** Mark applications and cleanses are tightly integrated with skill trigger execution order and write logs (`skillLog`) inline.
* **Core Mechanics Dependency:** Status marks directly drive major gameplay modifiers, including Flop X, Four-Point Bait X, Lung Burner X, Debt Collector X, Hooked stamina tax, Pinned recovery blocks, and Static skill disruptions.
* **Extraction Timing:** Relocating or refactoring these lifecycles should wait until dedicated status mark simulation tests and snapshots are established.

---

## Status Marks Registry

### Exposed
* **Source:** `Red Dot X` / `DEEP_STRIKE_EXPOSE_SETUP`
* **Target:** Primary Defender
* **Duration:** 3 possessions (fixed)
* **Effect:** Required to enable `Four-Point Bait X` rolls (bypassing normal shooting foul checks).

### Debt
* **Source:** `Chain Pass X` / `COURT_VISION_CHAIN_PASS`
* **Target:** Opposing lowest-stamina player
* **Duration:** 3 possessions (fixed)
* **Effect:** Adds `+10` stamina drain to `Lung Burner X` (under a hard pre-snowball cap of 40); consumed by `Debt Collector X` to trigger splash stamina damage.

### Hooked
* **Source:** `Cage Step X` / `LOCK_CHAIN_CAGE_STEP`
* **Target:** Opposing ball handler
* **Duration:** 2 possessions (fixed)
* **Effect:** Drains `38` stamina at the start of each possession loop via `applyHookedTax`.

### Pinned
* **Source:** `Corner Trap X` / `DEFENSIVE_ANCHOR_CORNER_TRAP`
* **Target:** Opposing shooter
* **Duration:** 2 possessions (fixed)
* **Effect:** Blocks skill-based stamina recovery (`recoverSkillStamina`).

### Static
* **Source:** `Dead Air X` / `GAMEPLAN_DEAD_AIR`
* **Target:** Opposing shooter
* **Duration:** 2 possessions (fixed)
* **Effect:** Applies a flat `-0.025` shot quality penalty and blocks skill trigger moments.

### Tilted
* **Source:** `Paint Magnet` (Base Skill) or `Contact Tax X` / `POSTER_SPARK_CONTACT_TAX`
* **Target:** Primary Defender
* **Duration:** 3 possessions (fixed)
* **Effect:** Adds `+0.035` base shooting foul chance and enables `Flop X` triggers.

---

## Counter / Cleanse Behavior

* **Timeout Reset (`TIMEOUT_RESET_CLEANSE`):** Cleanses the oldest active mark from all on-court players and grants 1-possession immunity.
* **Composure Shield (`COMPOSURE_SHIELD_CANCEL`):** Does not cleanse marks, but counters Flop X and Four-Point Bait X pressure effects during shot resolution.
* **Clean Challenge (`CLEAN_CHALLENGE_CONTEST`):** Does not cleanse marks, but counters Flop X and Four-Point Bait X pressure effects during shot resolution.
* **Discipline Wall:** Does not cleanse marks, but reduces Four-Point Bait X shot quality penalty.
* **Possession Decay:** Marks decrement duration by 1 at the start of each possession tick via `decayMarks`.
* **Substitution Cleanup:** Moving a player to the bench deletes all their active marks and immunities immediately.

---

## Pinned Bench-Cleansing Mismatch (Design / Bug Note)

> [!IMPORTANT]
> **Design Mismatch Resolved (Phase SkillDecision-1A):**
> * **Approved Decision:** Option A — Text Update Only.
> * **Intentional Behavior:** Pinned blocks active skill-based stamina recovery while on court. It does not block bench recovery because all active marks are cleared upon substitution.
> * **Resolution:** Corner Trap X UI text and Marks/Stamina documentation have been aligned to reflect this behavior. The mismatch is resolved.

---

## Future Validation Requirements

A validation script `src/scripts/validation/test_mark_helpers.ts` must be created prior to mark code extraction. It must assert:
* Exposed, Tilted, and Debt durations remain exactly 3 possessions.
* Hooked, Pinned, and Static durations remain exactly 2 possessions.
* Timeout Reset cleanses the oldest mark and applies 1-possession immunity.
* Substitution cleanup removes active marks.
* Debt Collector X correctly consumes the Debt mark.
* Four-Point Bait X requires Exposed.
* Flop X requires Tilted.
* Lung Burner X requires any mark.
* Dead Air X applies Static.
* No RNG sequence or event log output is changed.
