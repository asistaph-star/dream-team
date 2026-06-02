# Match Gameplay Architecture

This page documents the front-end layout, component extraction, animations, and scaling rules for the live Match Gameplay screen.

---

## 1. UI Refactoring timeline

The live match screen was refactored across several phases to reduce file complexity without touching core logic:
* **Phase 1 — Pure Helpers**: Extracted pure helpers (e.g., true shooting calculation, position styling classes, fallback player images) from `page.tsx` into external utilities.
* **Phase 2 — Presentational Player Components**: Extracted heavy player UI cards and elements into `src/features/match/components/`:
  - `MythicEnergyAura`: Multi-color premium aura for mythical cards.
  - `DragGhost`: Visual placeholder during substitution drag-and-drop.
  - `RunOverlay` & `FreeThrowPopup`: Sequential overlay panels.
  - `PlayerEventBanner` & `ShotMeter`: Event-based notifications.
  - `FoulPips`: Disqualification indicators.
  - `PlayerTooltip`: Low-poly tooltips.
  - `PlayerAvailabilityOverlay`: Fatigue and substitution cooldown locks.
  - `MatchPlayerUnit`: Reusable standard lineup node wrapper.
* **Phase 3 — Substitution Modal**: Extracted `SubstitutionModal` as a separate presentational layer, while keeping all substitution swaps, cooldown checks, and lineup mutation limits inside the central match controller.
* **Phase 4 — Scoreboard & HUD Decomposition**: Extracted the final large UI blocks:
  - `PreMatchScreen` & `PostGameScreen`
  - `MatchScoreboard` & `MatchBottomHUD`
  - `MatchActionBar` & `ShootoutOverlay`
  - `EnergyDrinkModal` & `StrategyModal`
  - `OvertimeTransitionOverlay`, `MatchExitButton`, and dev-tools controllers.

### Code Organization
* **Monolithic reduction**: `src/app/match/page.tsx` was reduced from 2500+ lines to a clean 1100–1200 line controller brain.
* **Components location**: UI elements reside inside `src/features/match/components/`.
* **Styles**: Screen-scale styles reside in `src/features/match/styles/getMatchStyles.ts`.

---

## 2. Viewport scaling & Widescreen Black Bars Fix

### The Problem
On monitors wider than the stadium's native `1420x800` layout, large black letterbox bars appeared on the left and right sides of the UI.

### Failed Scaling Attempt
Applying `Math.max(scaleW, scaleH)` successfully filled widescreen monitors, but it zoomed in the monolithic UI layer. This caused severe HUD cropping (hiding the scoreboard), enlarged player cards excessively, and brought the interactive court uncomfortably close to the screen edges.

### The Canonical Solution
1. **Restore Containment**: The scaling algorithm was locked back to `Math.min(scaleW, scaleH)` to ensure that the entire interactive `1420x800` stadium and HUD layers fit safely inside any aspect ratio viewport without cropping.
2. **Ambient Stadium Background**: A full-screen, dimmed, and blurred match stadium background image was layered behind the stadium card container. This ambient background spans the entire widescreen area, eliminating the black letterbox sidebars while retaining perfect stadium proportions.

> [!IMPORTANT]
> **Scaling Guardrail**: Do NOT use `Math.max` for scaling the global container unless the HUD (scoreboard, action buttons) and court are completely decoupled into responsive layout sheets. Monolithic scaling must strictly use `Math.min` with ambient background fill to keep the HUD visible.
