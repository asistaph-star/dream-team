# NBA Data Pipeline & Rating Models

Welcome! The daily statistics updates, ESPN glossary rating derivations, price rank matrices, and overall rating mapping tables have been modularized. This page serves as the entry point for all data pipeline documentation.

> [!IMPORTANT]
> **Core OVR Rules**:
> - **OVR comes strictly from the NBA Data Pipeline** (Performance rankings, stats, and clamped OVR brackets).
> - **Star-up upgrades do NOT increase player OVR** (Ascension only scales gameplay-relevant attributes like 3PT or Calm, and unlocks learned skill slots).

---

## Document Index

* **[[wiki/systems/nba-data-pipeline/00 Current NBA Data Pipeline State|00 Current NBA Data Pipeline State]]** — Global entry point for all NBA Data Pipeline docs.
* **[[wiki/systems/nba-data-pipeline/01 OVR Source Rules|01 OVR Source Rules]]** — Player OVR brackets, game/minute eligibility filters, and OVR change daily stability guardrails.
* **[[wiki/systems/nba-data-pipeline/02 Current Prime Legend Data Model|02 Current Prime Legend Data Model]]** — ESPN rating math calculated from NBA.com fields, accent/suffix normalizations, daily update momentum formulas, prices, and player card roster merging details.
