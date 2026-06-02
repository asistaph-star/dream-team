# Player Card And Upgrade Systems

Welcome! The Player Card, Upgrade, and Skill systems have been modularized and cleaned up. This page serves as the entry point for all player card and upgrade documentation.

---

## Document Index

* **[[wiki/systems/player-card-upgrade/00 Current Canonical System State|00 Current Canonical System State]]** — The central source of truth for the entire player and upgrade architecture.
* **[[wiki/systems/player-card-upgrade/01 Base Skills|01 Base Skills]]** — Specifications for the 22 base skills and player identity scaling.
* **[[wiki/systems/player-card-upgrade/02 Learned Special Skills|02 Learned Special Skills]]** — Specifications for learned skills, reroll protection, and the 15 final families.
* **[[wiki/systems/player-card-upgrade/03 Special Skill Migration|03 Special Skill Migration]]** — Detailed breakdown of mechanic resolver adapters, Batches A-G, and stability regression testing.
* **[[wiki/systems/player-card-upgrade/04 Upgrade System|04 Upgrade System]]** — Ascension brackets, material costs, duplicate consumption matrices, and duplicate learned skill alerts.
* **[[wiki/systems/player-card-upgrade/05 Guardrails|05 Guardrails]]** — Architecture rules, TypeScript workflows, and anti-rollback policies.
* **[[wiki/systems/player-card-upgrade/06 Next Work|06 Next Work]]** — Activation pre-requisites for the new rolling pool and native mechanics design directions.
* **[[wiki/systems/player-card-upgrade/99 Historical Deprecated Notes|99 Historical Deprecated Notes]]** — Consolidated archives of retired naming and old milestone logs.

---

## Core System Overview

* **OVR Integrity**: Overall Ratings are strictly performance-based, derived from the NBA Data Pipeline, and remain **unchanged** by star upgrades.
* **Upgrade Attributes**: Star Upgrades only boost gameplay-relevant attributes (e.g. 3PT, Rebound, Calm) used by the match simulation. Upgrades require duplicate cards (up to 20 total for max rank) but are completely **safe** (duplicates are not consumed on failure).
* **Decoupled Skills**: Special learned skills roll into a non-destructive pending state with warnings protecting Epic and Legendary skills from accidental overwrite.
