# Current NBA Data Pipeline State

Welcome to the NBA Data Pipeline documentation directory. This is the single source of truth for daily statistics syncs, rating derivations, player market ranks, and card overall ratings (OVR) of the Dream Team game.

---

## Document Index

* **[[01 OVR Source Rules]]**: Overall Rating mapping tables, eligibility game/minute constraints, and the OVR Stability daily change guardrails.
* **[[02 Current Prime Legend Data Model]]**: Real-season stats mappings, the ESPN glossary rating formula computed from NBA.com fields, and daily rank/price calculations.

---

## Core Code Files & Scripts

* [sync_player_updates.py](file:///c:/Users/Nhico/Documents/School/dream-team/scratch/sync_player_updates.py) — Daily statistics fetcher, OVR mapping script, and eligibility filter.
* [nbaAttributeMapper.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/nbaAttributeMapper.ts) — Decoupled attribute formulas translating raw box scores into detailed gameplay attributes.
* [starGrowth.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/utils/starGrowth.ts) — Star-up attribute growth math that preserves `ovr` after card upgrades.
