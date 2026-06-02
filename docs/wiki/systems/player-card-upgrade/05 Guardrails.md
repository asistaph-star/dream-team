# Guardrails

## Absolute Rules
These rules must **never** be violated without explicit approval.

### OVR & Star-Up
- OVR comes **only** from the NBA Data Pipeline.
- Star-up **does not** increase OVR.
- Star-up only boosts gameplay attributes and unlocks Learned Skill slots.

### System Locks
- Base Skills are **locked stable** (Phase SkillSystem-1Q).
- Upgrade System is **locked stable** (Phase UpgradeSystem-2C).
- MatchEngine mechanic migration is **locked stable** (Phase SpecialSkill-2A16).

### Rolling Pool
- Legacy rolling pool is **still active**.
- New family IDs are **not active** in rolling.
- Do not activate new family rolling pool until:
  - All 15 native mechanics are implemented.
  - `SPECIAL_SKILL_RATES` has base rates for all 15.
  - `SPECIAL_SKILL_TEXT` has descriptions for all 15.
  - UI/icons can handle all 15.
  - Reroll/duplicate prevention passes.
  - Balance harness passes full regression.

### Saved Data
- Do not mutate saved `specialSkillSlots`.
- Do not mutate rarity keys.
- Do not delete legacy skill support yet.

### Protected Skills
- **Flop** is protected and must not be removed, renamed, or merged away.

### Architecture
- Do not dump all skill logic into one giant file or one folder.
- Keep responsibilities separated:
  - Skill family definitions (`skillFamilies.ts`)
  - Mechanic IDs (`skillMechanics.ts`)
  - Trigger/rate helpers (`skillResolver.ts`)
  - Engine effect logic (`matchEngine.ts`)
  - Skill display (`skillDisplay.ts`)
  - Icon mapping (`SkillBadge.tsx`)
  - Migration compatibility (`skillMigration.ts`)
  - UI/reroll display (`GameStateContext.tsx`, `PlayerHexProfileModal.tsx`)

### Anti-Rollback
- Do not rewrite a whole page from memory.
- Do not recreate old UI.
- Do not replace canonical components with copied JSX.
- Do not touch unrelated files during focused extraction.
- Do not "clean up" logic while extracting UI.

## Balance Guardrails
These ranges represent expected healthy simulation output:

| Metric | Expected Range |
|---|---|
| Average combined score | 190–225 |
| FTA per team | 16–23 (natural outliers allowed) |
| Turnovers per team | 11–15 |
| Steals per team | 5–7 |
| Blocks per team | 3–5 |
| OREB per team | 9–12 |
| FG% | 35%–55% |
| 3PT% | 25%–60% |

### Red Flags
Stop immediately if any of these occur:
- A legacy skill stops triggering.
- Rarity scaling appears bypassed.
- FTA spikes above 40 per team.
- Stamina collapses to zero team-wide.
- Marks loop permanently without expiring.
- matchEngine crashes.
- New family IDs appear in rolled skills.
- Saved data mutates unexpectedly.
- OVR changes from star-up.
