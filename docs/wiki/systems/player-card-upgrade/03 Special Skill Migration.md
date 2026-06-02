# Special Skill Migration

## Overview
The special skill system is being migrated from 15 legacy hardcoded skill strings to 15 architecture-aware family IDs. The migration is behavior-preserving: old skills still work exactly as before, but the engine now uses mechanic adapters instead of raw string checks.

**Current status:** Legacy rolling pool is still active. New family IDs are shadow-mode only. No saved data has been mutated.

---

## Architecture Layers

### Card Era & Skill Tier Naming (Phase 2A1)
- **Card Eras:** Current → Prime → Legend
- **Skill Tiers:** Standard → Prime → Legacy → Signature
- Added: `src/lib/players/playerCardTypes.ts`, `src/lib/players/playerEra.ts`, `src/lib/skills/skillDisplay.ts`, `src/lib/skills/skillMigration.ts`

### Family Catalog (Phase 2A2)
- Added: `src/lib/skills/skillFamilies.ts`
- Defined 15 family IDs in 3 categories (5 Offense / 5 Defense / 5 Comprehensive).
- Legacy skills map to families via `resolveSpecialSkillFamily()`.
- `isLegacySpecialSkillName()` identifies old strings.

### Family-Aware Resolver Helpers (Phase 2A4)
- `resolveSpecialSkillFamily()` returns the parent family for any skill string.
- `getSpecialSkillQuality()` reads rarity from `skillRarities`.
- `formatSkillName()` handles both legacy and future display.

### Family-Aware Duplicate Prevention (Phase 2A5)
- `wouldCreateDuplicateFamily()` blocks rolling a skill from the same family as an equipped skill.
- A player with `Red Dot X` cannot roll `Four-Point Bait X` (both map to `DEEP_STRIKE`).
- Works correctly for both legacy strings and future family IDs.

### Flop Preservation (Phase 2A10.5)
- Replaced `HANGTIME_FINISH` with `FLOP` in the family catalog.
- Flop is one of the final 15 families.
- `Flop X` maps to `FLOP`. It no longer maps to `HANGTIME_FINISH`.
- Flop is protected and must not be removed or renamed.

---

## Mechanic Adapters

### Mechanic Adapter Helpers (Phase 2A7)
- Added: `src/lib/skills/skillMechanics.ts`
- Defined `SpecialSkillMechanicId` type and `LEGACY_TO_MECHANIC_MAP`.
- Helpers: `resolveSpecialSkillMechanics()`, `doesSkillMatchMechanic()`, `hasSpecialSkillMechanic()`, `getPlayerSpecialSkillMechanics()`, `getSpecialSkillsForMechanic()`.
- Future family IDs intentionally resolve to no mechanics (empty array) to prevent accidental inheritance.

### Mechanic-Aware Trigger Helpers (Phase 2A8)
- Added to `src/lib/skills/skillResolver.ts`: `getBestSpecialSkillForMechanic()`, `rollSpecialMechanic()`.
- `rollSpecialMechanic()` preserves rarity scaling by resolving the exact raw legacy skill key for rate lookup.

---

## MatchEngine Migration Batches

All batches replaced direct legacy string checks (`rollSpecial(...)`) with mechanic adapter calls (`rollSpecialMechanic(...)` / `hasSpecialSkillMechanic(...)`). Rarity scaling is preserved because the helpers resolve the exact raw legacy skill key.

| Batch | Phase | Skills Migrated |
|---|---|---|
| A | 2A9 | Cold Timeout X, Composure X, Clean Contest X |
| B | 2A10 | Chain Pass X, Cage Step X |
| C | 2A11 | Red Dot X, Contact Tax X, Corner Trap X |
| D | 2A12 | Dead Air X |
| E | 2A13 | Debt Collector X, Pressure Coach X |
| F | 2A14 | Lung Burner X, Five-Man Squeeze X |
| G | 2A15 | Flop X, Four-Point Bait X |

### Stability Lock (Phase 2A16)
- Full 30-match regression passed.
- Combined score: 180–225. FG%: 35%–55%. 3PT%: 25%–60%.
- FTA: 12–26 per team. No 40+ FTA explosions.
- Turnovers: 9–17. Steals: 3–8. Blocks: 2–6. OREB: 7–15.
- All 15 legacy learned skills trigger correctly.
- All marks apply, expire, and interact correctly.
- Flop/SGA modifier works. Four-Point Bait requires Exposed.
- Stamina drains correctly; no collapse. Substitutions cycle naturally.
- Saved data not mutated. Rarity keys unchanged.
- **Mechanic migration is locked stable.**

---

## Rolling Pool Activation Plan (Phase 2A17)

### Activation Risks
- New family IDs do not have native matchEngine mechanics yet.
- New family IDs are not in `SPECIAL_SKILL_RATES`.
- Missing base rates would break trigger math.
- New family IDs may lack icon assets and tooltip descriptions.
- Activating now would create skills that display poorly or do nothing in matches.

### Decision
- **Option D approved:** Keep legacy roll pool until each new family gets real mechanics and UI/rate support.
- **Recommendation E approved:** Keep legacy roll pool and start designing native mechanics family by family.
- No save migration yet.

---

## Native Mechanics Design (Phase 2B1)

Design audit completed for all 15 families. Key principles:
- Reduced stamina-drain identity (less oppressive team-wide drains).
- Flop protected for SGA / Harden / Luka-type foul drawers.
- Rarity scales trigger chance, not effect power.
- New mechanics must be basketball-authentic.

Next implementation starts with **Batch 1: Counters/Utility** (COMPOSURE_SHIELD, CLEAN_CHALLENGE, TIMEOUT_RESET, BENCH_CAPTAIN, COURT_VISION_ENGINE).

New rolling pool will NOT be activated until all 15 mechanics are built, base rates added, descriptions written, icons verified, and balance regression passed.
