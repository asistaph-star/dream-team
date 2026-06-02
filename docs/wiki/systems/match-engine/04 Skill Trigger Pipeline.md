# Skill Trigger Pipeline

This page documents the mathematical pipelines for skill triggers, quality multipliers, active team-wide boosts, and mechanic-aware resolver loops.

---

## 1. Skill Quality Rarity Multipliers

The base trigger rate of any special learned skill is scaled by its quality rating. Rarity drops and multipliers are defined in [skillCatalog.ts](file:///c:/Users/Nhico/Documents/School/dream-team/src/lib/skills/skillCatalog.ts#L8-L19):

| Quality | Roll Chance | Trigger Multiplier | UI Text Color |
|---|---|---|---|
| **Common** | 62.0% | `0.40` | Emerald/Green |
| **Rare** | 25.0% | `0.60` | Blue |
| **Elite** | 10.0% | `0.80` | Violet/Purple |
| **Epic** | 2.5% | `1.00` | Orange |
| **Legendary** | 0.5% | `1.20` | Red (Glow) |

### Rate Formula
To calculate a player's actual trigger rate for a skill:
```typescript
export const getSkillQualityRate = (maxRate: number, quality: SkillQuality = "Common"): number => {
  return Math.floor(maxRate * SKILL_QUALITY_CONFIG[quality].multiplier);
};
```
*Example*: A legendary skill with a max rate of `300` triggers at `360` out of `1000` (36% chance). A common version of the same skill triggers at `120` out of `1000` (12% chance).

---

## 2. Complete Engine Trigger Rate Boost

Teammates with the `Complete Engine` base skill boost the trigger rates of the entire lineup.

### Trigger Constraint
* Only active when the skill holder has **at least 40% stamina**.
* **Identity Scaling**: The boost scales based on the holder's player identity:
  ```typescript
  const completeEngineIdentity = (getOffenseRating(holder) + getOnBallDefenseRating(holder) + getAssistRating(holder)) / 3;
  const completeEngineScale = 0.90 + (completeEngineIdentity / 100) * 0.20;
  const teamBoostMultiplier = 1.04 * completeEngineScale;
  ```
  This applies a dynamic team-wide multiplier to all active base and special trigger rates.

---

## 3. The Base Skill Trigger Pipeline

Base skills trigger via `rollBaseSkill()`:
1. Count the number of active lineup players holding the target base skill.
2. Resolve the baseline rate from `BASE_SKILL_RATES` (e.g. `Tempo Surgeon` uses `[120, 190, 270]` based on 1, 2, or 3 holders).
3. Apply the dynamic `Complete Engine` boost multiplier.
4. Roll a random integer between `0` and `1000`. If the roll is less than the boosted rate, the skill triggers.

---

## 4. The Mechanic-Aware Special Skill Pipeline

Special learned skills trigger via `rollSpecialMechanic()` to keep legacy strings compatible with modern mechanic IDs.

```
[Trigger Request] 
       │
       ▼
[Filter Lineup for Players with Mechanic ID] 
       │
       ▼
[Select Player's Best Skill via getBestSpecialSkillForMechanic()] 
       │
       ▼
[Look up Legacy Skill Rarity in player.skillRarities] 
       │
       ▼
[Apply Quality Multiplier & Identity Scales] 
       │
       ▼
[Apply Complete Engine Teammate Boost] 
       │
       ▼
[Roll (random * 1000 < Max Boosted Rate)]
```

### Steps:
1. **Filter Holders**: The engine scans the active lineup for players holding a skill that maps to the requested `SpecialSkillMechanicId` in `skillMechanics.ts`.
2. **Resolve Best Skill**: If a player has multiple matching skills, `getBestSpecialSkillForMechanic()` selects the one with the highest base trigger rate.
3. **Preserve Quality**: Looks up the player's custom rarity for the resolved legacy skill string (e.g. `"Flop X"`) from `player.skillRarities` to retrieve the correct multiplier.
4. **Roll Check**: Computes the boosted rate using the resolved quality, scale factor, and `Complete Engine` multiplier, then rolls.
5. **Emergent Gameplay**: This adapter pipeline allows legacy cards to trigger mechanics correctly while maintaining complete save file integrity.
