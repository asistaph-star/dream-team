# Match Engine Decomposition Map

This document maps the decomposition of `matchEngine.ts` (~3,680 lines) into cleaner modular systems.

- **Original line count**: 3,682
- **Batch A commit**: `0605221b6d0819ce299dfbf87c933c8b41ca0fa8`
- **Batch B commit**: `58c271d2f048947d29a221aebbd7a69d5703997c`
- **Current line count (matchEngine.ts)**: 3,527

---

## Mapped Sections & Extraction Targets

### 1. Support & Utility Helpers
* **Original Line Range**: ~198 - ~296, ~395 - ~434
* **Local Functions / Logic**: `recoverToMax`, `staminaPct`, `ensureStats`, `ensureForm`, `ensureFormFired`, `skillLog`
* **Captured State Variables**: `newStamina`, `newEvents`, `newPlayerStats`, `newSkillMarks`, `newFormRating`, `newFormFired`
* **Target Module**: `src/lib/match/engine/eventLogBuilder.ts`, `src/lib/match/engine/playerStatMutations.ts`, `src/lib/match/engine/staminaMutations.ts`
* **RNG Calls**: None
* **Risk Level**: Low (Batch A)

### 2. Overtime & Period Orchestration
* **Original Line Range**: ~328 - ~394
* **Local Logic**: OT period advancement,OT scores creation, overtime break stamina recovery
* **Captured State Variables**: `newQuarter`, `newClock`, `otScores`, `otPeriod`, `events`, `playerStamina`
* **Target Module**: `src/lib/match/engine/matchTick.ts`
* **RNG Calls**: None
* **Risk Level**: Medium (Batch E)

### 3. Mark Lifecycle & Immunities
* **Original Line Range**: ~398 - ~402, helper references
* **Local Logic**: Decay of player marks and active mark lifecycle mutations
* **Captured State Variables**: `skillMarks`, `markImmunity`
* **Target Module**: `src/lib/match/engine/markLifecycle.ts`
* **RNG Calls**: None
* **Risk Level**: Low (Batch A)

### 4. Active Special Skill Hooks
* **Original Line Range**: ~435 - ~640
* **Local Functions**: `tryColdTimeout`, `applyBenchCaptain`, `applyMomentumSwing`, `applyDefensiveAnchor`
* **Captured State Variables**: `newStamina`, `newSkillMarks`, `newMarkImmunity`, `newFormRating`, `newFormFired`, `newEvents`, `teamSkillBuffs`, `activeSkillBuffs`
* **Target Module**: `src/lib/match/engine/skillHooks.ts`
* **RNG Calls**: Yes (`Math.random` in `rollSpecial` or conditional rolls)
* **Risk Level**: Medium (Batch B)

### 5. Possession Timer & Turnover Resolvers
* **Original Line Range**: ~641 - ~740, turnovers inside possession resolution
* **Local Logic**: Shot clock ticking, possession team swaps, turnover triggers, Broken Play Rescue saves
* **Captured State Variables**: `possessionClock`, `possessionTeam`, `lastPlayCategory`, `playerStats`, `events`
* **Target Module**: `src/lib/match/engine/turnoverResolver.ts`
* **RNG Calls**: Yes (`Math.random` for turnovers and Broken Play Rescue rolls)
* **Risk Level**: High (Batch C)

### 6. User and AI Possession Resolvers
* **Original Line Range**: ~741 - ~1850 (User possession), ~1851 - ~2950 (AI possession)
* **Local Logic**: Full play resolution, drives, shot selection, defensive matchups, and shot contests
* **Captured State Variables**: Virtually all match state fields (lineup IDs, stamina, scores, strategies)
* **Target Module**: `src/lib/match/engine/possessionResolver.ts`
* **RNG Calls**: Extensive `Math.random` calls (RNG-sequence critical)
* **Risk Level**: High (Batch C & D)

### 7. Shot Attempt & Resolution Flow
* **Original Line Range**: Inside possession loops, And-1 calculations, green release window
* **Local Logic**: Shot selection weight scales, final chance, and And-1 extra free throws
* **Captured State Variables**: `playerStats`, `userScore`, `aiScore`, `events`
* **Target Module**: `src/lib/match/engine/shotPossessionResolver.ts`
* **RNG Calls**: Yes (Shot success and shooter weights)
* **Risk Level**: High (Batch D)

### 8. Foul & Free Throw Resolver
* **Original Line Range**: Free throw loop execution, shooting foul determinations
* **Local Logic**: Free throw count, shooting results, crowd noise penalty, and-1 free throws, Flop vs Composure Shield
* **Captured State Variables**: `ftSequence`, `teamFouls`, `isInBonus`, `events`, `playerStats`
* **Target Module**: `src/lib/match/engine/foulResolver.ts`
* **RNG Calls**: Yes (Free throw outcome generation)
* **Risk Level**: High (Batch D)

### 9. Rebound Resolve Flow
* **Original Line Range**: Defensive/Offensive rebound determinations, Glass Strike putback tries
* **Local Logic**: Rebound chance, rebounder selection, putback action triggers
* **Captured State Variables**: `playerStats`, `events`, `possessionTeam`
* **Target Module**: `src/lib/match/engine/reboundResolver.ts`
* **RNG Calls**: Yes (Rebounder selection and putback success rolls)
* **Risk Level**: High (Batch D)

### 10. Auto-Substitution & Foul-Outs
* **Original Line Range**: Starters vs bench fatigue swaps, fouled-out list checks
* **Local Logic**: Auto sub checking, court players check
* **Captured State Variables**: `fouledOut`, `aiLineupIds`, `userPlayerIds`, `playerStamina`
* **Target Module**: `src/lib/match/engine/autoSubstitutionResolver.ts`
* **RNG Calls**: None
* **Risk Level**: Medium (Batch C)

---

## Extraction Schedule

1. **Batch A (Support Core)**: Extract logging, marks, stamina change, stats change, momentum, form rating.
2. **Batch B (Skill Hooks)**: Extract skill trigger checking (Bench Captain, Timeout Reset, Defensive Anchor, Momentum Swing).
3. **Batch C (Possession Flow)**: Extract separate User and AI possession flows, turnovers, and substitution checks.
4. **Batch D (Foul, Rebound, Shot)**: Extract And-One, Free Throws, Fouls, Rebounds, and Shot Attempts.
5. **Batch E (Tick Orchestrator)**: Refactor `matchTick.ts` to coordinate the modules, shrink `matchEngine.ts` wrapper.
