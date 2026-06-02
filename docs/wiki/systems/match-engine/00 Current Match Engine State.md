# Current Match Engine State

Welcome to the Match Engine documentation directory. This is the single source of truth for the match gameplay, simulation, balancing, and state rules of the Dream Team game.

---

## Document Index

* **[[01 Match Gameplay Architecture]]**: UI layouts, responsive scaling scale factors (black side bars fix), premium animations, and viewport containment.
* **[[02 Match Simulation Balance]]**: Smart Fatigue (stamina reweighting), possession timing calibration, crowd energy/rally rebalances, 3PT additive bonus caps, and the frontend-equivalent balance harness (`sim_accurate_mock.ts`).
* **[[03 Marks And Stamina]]**: Marks definition (Exposed, Debt, Hooked, Pinned, Static, Tilted), same-mark immunity, mark decay, stamina drain scaling, and action stamina costs.
* **[[04 Skill Trigger Pipeline]]**: Complete Engine trigger rate boosts, `rollBaseSkill()`, and mechanic-aware `rollSpecialMechanic()` pipelines.

---

## Core Code Files

* [matchEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchEngine.ts) — Main possession simulator, state loops, fouls, clock, substitutions, and skill triggers.
* [shotEngine.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/shotEngine.ts) — Shot zone modifiers, shot clock calculations, and the Smart Fatigue reweighting algorithm.
* [playerIdentity.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/playerIdentity.ts) — Attribute scaling fallbacks and tendency wrappers.
* [matchTypes.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchTypes.ts) — Global match state interface, event definitions, and effective attribute calculations.
* [matchNarrative.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/matchNarrative.ts) — Play-by-play commentary generators.
