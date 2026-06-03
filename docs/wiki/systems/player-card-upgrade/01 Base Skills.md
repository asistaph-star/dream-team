# Base Skills

## Overview
22 base skills assigned through `assignBaseSkillsFromStats` using real NBA data. Each player gets 3 base skill slots. Slot 3 is locked until OVR ≥ 85. Base Skills are **locked stable** as of Phase SkillSystem-1Q.

## Assignment & Real-Data Mapping
- **Phase SkillAssignment-1A:** Fixed base skill assignment to use real NBA data instead of hardcoded fallbacks. Foul Magnet corrected from personal fouls to free throw attempts / foul draw tendency. Arc Pressure uses real 3PT volume/efficiency logic. Paint Magnet fake fallback removed. Glass Touch fallback cleanup completed.
- **Phase SkillAssignment-1C:** Remaining base skill assignment fallbacks cleaned up. All 22 skills now derive from real stats and attributes.

## Identity Scaling
Each base skill's effect is scaled through Player Identity helpers defined in `playerIdentity.ts`. Effects are behavior-only and never touch OVR, salary, or rarity.

### Offense Skills
| Skill | Phase | Identity Helpers |
|---|---|---|
| Arc Pressure | SkillSystem-1B | `getThreePtRating` |
| Paint Magnet | SkillSystem-1B | `getFinishingRating` |
| Tempo Surgeon | SkillSystem-1F | `getHandleRating`, `getAssistRating` |
| Mismatch Caller | SkillSystem-1K | (static) |
| Power Driver | SkillSystem-1P | `getStrengthRating`, `getFinishingRating` |
| Foul Magnet | SkillSystem-1D | `getFoulDrawTendency` |
| Glass Touch | SkillSystem-1C | `getReboundRating` |

### Defense Skills
| Skill | Phase | Identity Helpers |
|---|---|---|
| Rim Warden | SkillSystem-1H | `getBlockRating` |
| Hands Active | SkillSystem-1E | `getStealRating` |
| Screen Breaker | SkillSystem-1I | `getOnBallDefenseRating` |
| Shadow Guard | SkillSystem-1H | `getOnBallDefenseRating` |
| Discipline Wall | SkillSystem-1H | `getOnBallDefenseRating` |
| Focus Lock | SkillSystem-1H | `getOnBallDefenseRating` |
| Paint Barrier | SkillSystem-1C | `getReboundRating` |

### Comprehensive Skills
| Skill | Phase | Identity Helpers |
|---|---|---|
| Complete Engine | SkillSystem-1L | `getOffenseRating`, `getOnBallDefenseRating`, `getAssistRating` |
| Iron Motor | SkillSystem-1M | `getStaminaRating` |
| Share Rhythm | SkillSystem-1N | `getAssistRating` |
| Enforcer Lift | SkillSystem-1O | `getOnBallDefenseRating`, `getStrengthRating`, `getStaminaRating` |
| Connector Hub | SkillSystem-1F | `getAssistRating` |
| Position Flex | SkillSystem-1K | (static) |
| Future Core | SkillSystem-1K | (static) |
| Tempo Switch | SkillSystem-1K | (static) |

## Player Identity Helpers (Foundation)
Created in Phases PlayerIdentity-1B through PlayerIdentity-1X:
- `getThreePtRating`, `getFreeThrowRating`, `getFoulDrawTendency`, `getFinishingRating`, `getReboundRating`, `getStealRating`, `getBlockRating`, `getHandleRating`, `getAssistRating`, `getOnBallDefenseRating`, `getSpeedRating`, `getStrengthRating`, `getOffenseRating`, `getTwoPtRating`, `getStaminaRating`, `getCalmRating`
- `getShotIdentityEfficiencyAdjustment` for unified shot identity scaling.
- `getThreePtTendency` wired into `shotEngine.ts` to reduce unnecessary 3PT attempts for non-shooters.

## Stability Lock (Phase SkillSystem-1Q)
- Full 30-match regression passed.
- All 22 base skills trigger with identity-appropriate rates.
- No score collapse, no FTA explosion, no stamina collapse.
- Base Skills are **locked stable**. Do not change unless a real bug appears.

## Core Rules
- OVR comes only from the NBA Data Pipeline.
- Star-up does not increase OVR.
- Base Skills are scaled through Player Identity helpers only.
- Base Skills never touch OVR, salary, or rarity.
