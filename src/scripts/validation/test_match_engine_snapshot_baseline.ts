// test_match_engine_snapshot_baseline.ts
import * as fs from 'fs';
import * as path from 'path';
import { simulateTick, mockAiTeams, createInitialMatchState, computeEffective } from '../../lib/utils/matchEngine';
import { Player } from '../../lib/types/player';

// Mulberry32 seedable generator
function seedRandom(seed: number) {
  let a = seed;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const originalRandom = Math.random;

// Patch Math.random
function patchRandom(seed: number) {
  globalThis.Math.random = seedRandom(seed);
}

// Restore Math.random
function restoreRandom() {
  globalThis.Math.random = originalRandom;
}

interface Snapshot {
  scenario: string;
  finalScore: { user: number; ai: number };
  quarterScores: { user: number[]; ai: number[] };
  totals: {
    user: Record<string, number>;
    ai: Record<string, number>;
  };
  quarterStamina: Record<string, number[]>;
  playerStats: Record<string, any>;
  skillTriggers: Record<string, number>;
  marksApplied: Record<string, number>;
  eventLogCount: number;
}

// Scenario setups
const SCENARIOS = [
  {
    name: 'balanced_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      // Balanced NORMAL vs NORMAL, keep base skills and default properties
    }
  },
  {
    name: 'high_offense_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.shooting = 150;
        p.finishing = 150;
        p.playmaking = 150;
        p.offense = 150;
      });
    }
  },
  {
    name: 'high_defense_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.defense = 150;
        p.onBall = 150;
        p.steal = 150;
        p.block = 150;
      });
    }
  },
  {
    name: 'high_stamina_pressure_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.specialSkillSlots = ['SKY_WALL', 'LOCK_CHAIN'];
        p.skillRarities = { SKY_WALL: 'Legendary', LOCK_CHAIN: 'Legendary' };
      });
    }
  },
  {
    name: 'foul_draw_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.foulDrawTendency = 1.0;
        p.specialSkillSlots = ['FLOP', 'DEEP_STRIKE'];
        p.skillRarities = { FLOP: 'Legendary', DEEP_STRIKE: 'Legendary' };
      });
    }
  },
  {
    name: 'high_iq_hustle_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.basketballIQ = 150;
        p.hustle = 150;
      });
    }
  },
  {
    name: 'low_iq_hustle_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.basketballIQ = 30;
        p.hustle = 30;
      });
    }
  },
  {
    name: 'family_skill_heavy_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      const skills = [
        'DEEP_STRIKE', 'COURT_VISION_ENGINE', 'POSTER_SPARK', 'FLOP', 'BROKEN_PLAY_RESCUE',
        'SKY_WALL', 'LOCK_CHAIN', 'DEFENSIVE_ANCHOR', 'CLEAN_CHALLENGE', 'GLASS_STRIKE',
        'BENCH_CAPTAIN', 'MOMENTUM_SWING', 'COMPOSURE_SHIELD', 'GAMEPLAN_JAMMER', 'TIMEOUT_RESET'
      ];
      [...userRoster, ...aiRoster].forEach((p, idx) => {
        const s1 = skills[idx % skills.length];
        const s2 = skills[(idx + 1) % skills.length];
        p.specialSkillSlots = [s1, s2];
        p.skillRarities = { [s1]: 'Elite', [s2]: 'Elite' };
      });
    }
  },
  {
    name: 'no_skill_baseline_teams',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      [...userRoster, ...aiRoster].forEach(p => {
        p.baseSkills = ['', '', ''];
        p.specialSkillSlots = [];
        p.skillRarities = {};
      });
    }
  },
  {
    name: 'close_clutch_game',
    setup: (userRoster: Player[], aiRoster: Player[]) => {
      // Balanced teams, but we will force clutch time state in the simulation runner
    }
  }
];

function runScenario(sc: typeof SCENARIOS[0], seed: number): Snapshot {
  patchRandom(seed);

  const userTeamBase = mockAiTeams.NORMAL;
  const aiTeamBase = mockAiTeams.NORMAL;

  const userRoster = userTeamBase.roster.map(p => ({ ...p, id: p.id + '_user', starLevel: 5 }));
  const aiRoster = aiTeamBase.roster.map(p => ({ ...p, starLevel: 5 }));

  sc.setup(userRoster, aiRoster);

  let userLineup = [...userRoster.slice(0, 5)];

  let state = createInitialMatchState();
  state.userOffStrategy = 'Motion Offense';
  state.userDefStrategy = 'Man-to-Man';
  state.aiOffStrategy = 'Motion Offense';
  state.userPlayerIds = userRoster.map(p => p.id);
  state.aiPlayerIds = aiRoster.map(p => p.id);
  state.aiLineupIds = aiRoster.slice(0, 5).map(p => p.id);
  state.disableAiCoach = true;

  userRoster.forEach(p => state.playerStamina[p.id] = 100);
  aiRoster.forEach(p => state.playerStamina[p.id] = 100);

  // For scenario close_clutch_game, set state to Q4 1:00 remaining, score tied 90-90
  if (sc.name === 'close_clutch_game') {
    state.quarter = 4;
    state.clock = 60; // 1 minute
    state.userScore = 90;
    state.aiScore = 90;
    state.possessionClock = 24;
    state.possessionTeam = 'user';
  }

  const aiTeamObj = {
    ...aiTeamBase,
    roster: aiRoster
  };

  const quarterStamina: Record<string, number[]> = {};
  [...userRoster, ...aiRoster].forEach(p => {
    quarterStamina[p.id] = [];
  });

  const skillTriggers: Record<string, number> = {};
  const marksApplied: Record<string, number> = {};

  let ticks = 0;
  let halftimeTriggered = false;
  let currentQuarter = state.quarter;

  while (!state.isFinished && ticks < 400) {
    // Substitutions
    userLineup.forEach((p, idx) => {
      if (state.playerStamina[p.id] < 50) {
        const bench = userRoster.filter(bp => !userLineup.some(lp => lp.id === bp.id));
        const sub = bench.sort((a, b) => (state.playerStamina[b.id] ?? 0) - (state.playerStamina[a.id] ?? 0))[0];
        if (sub && state.playerStamina[sub.id] > 70) userLineup[idx] = sub;
      }
    });

    const currentAiLineup = state.aiLineupIds.map(id => aiRoster.find(p => p.id === id)!).filter(Boolean);
    const newAiLineupIds = [...state.aiLineupIds];
    currentAiLineup.forEach((p, idx) => {
      if (state.playerStamina[p.id] < 50) {
        const bench = aiRoster.filter(bp => !newAiLineupIds.includes(bp.id));
        const sub = bench.sort((a, b) => (state.playerStamina[b.id] ?? 0) - (state.playerStamina[a.id] ?? 0))[0];
        if (sub && state.playerStamina[sub.id] > 70) {
          newAiLineupIds[idx] = sub.id;
        }
      }
    });
    state.aiLineupIds = newAiLineupIds;

    // Halftime recovery
    if (state.halftimeShown && !halftimeTriggered) {
      halftimeTriggered = true;
      userRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      aiRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
    }

    // Stamina log at quarter changes
    if (state.quarter !== currentQuarter) {
      [...userRoster, ...aiRoster].forEach(p => {
        quarterStamina[p.id].push(Math.round(state.playerStamina[p.id] ?? 0));
      });
      currentQuarter = state.quarter;
    }

    const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
    state.ftSequence = null;

    state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, userRoster);
    ticks++;
  }

  // Final quarter stamina log
  [...userRoster, ...aiRoster].forEach(p => {
    quarterStamina[p.id].push(Math.round(state.playerStamina[p.id] ?? 0));
  });

  // Calculate box score totals
  const totals = {
    user: { FGA: 0, FGM: 0, TPA: 0, TPM: 0, FTA: 0, FTM: 0, REB: 0, OREB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0, FOL: 0 },
    ai: { FGA: 0, FGM: 0, TPA: 0, TPM: 0, FTA: 0, FTM: 0, REB: 0, OREB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0, FOL: 0 }
  };

  Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
    const isUser = userRoster.some(p => p.id === playerId);
    const t = isUser ? totals.user : totals.ai;
    t.FGA += (s.FGA ?? 0); t.FGM += (s.FGM ?? 0);
    t.TPA += (s.TPA ?? 0); t.TPM += (s.TPM ?? 0);
    t.FTA += (s.FTA ?? 0); t.FTM += (s.FTM ?? 0);
    t.REB += (s.REB ?? 0); t.OREB += (s.OREB ?? 0);
    t.AST += (s.AST ?? 0); t.STL += (s.STL ?? 0);
    t.BLK += (s.BLK ?? 0); t.TOV += (s.TOV ?? 0);
    t.FOL += (s.FOL ?? 0);
  });

  // Parse events for skill triggers and mark applications
  state.events.forEach((e: any) => {
    if (!e.text) return;
    const txt = e.text;
    
    // Skill triggers
    const skills = [
      'Deep Strike', 'Court Vision', 'Poster Spark', 'Flop', 'Broken Play Rescue',
      'Sky Wall', 'Lock Chain', 'Defensive Anchor', 'Clean Challenge', 'Glass Strike',
      'Bench Captain', 'Momentum Swing', 'Composure Shield', 'Gameplan Jammer', 'Timeout Reset'
    ];
    skills.forEach(sk => {
      if (txt.includes(sk)) {
        skillTriggers[sk] = (skillTriggers[sk] || 0) + 1;
      }
    });

    // Mark applications/cleanses
    const marks = ['Exposed', 'Hooked', 'Pinned', 'Static', 'Tilted'];
    marks.forEach(m => {
      if (txt.includes(m)) {
        marksApplied[m] = (marksApplied[m] || 0) + 1;
      }
    });
  });

  restoreRandom();

  return {
    scenario: sc.name,
    finalScore: { user: state.userScore, ai: state.aiScore },
    quarterScores: {
      user: state.quarterScores?.user ?? [],
      ai: state.quarterScores?.ai ?? []
    },
    totals,
    quarterStamina,
    playerStats: state.playerStats,
    skillTriggers,
    marksApplied,
    eventLogCount: state.events.length
  };
}

function runAllScenarios(): Snapshot[] {
  const snapshots: Snapshot[] = [];
  SCENARIOS.forEach((sc, idx) => {
    // Using a separate fixed seed for each scenario
    const seed = 12345 + idx * 777;
    snapshots.push(runScenario(sc, seed));
  });
  return snapshots;
}

function verifySnapshots() {
  const filepath = path.join(__dirname, 'match_engine_snapshots.json');
  if (!fs.existsSync(filepath)) {
    console.error(`Error: Baseline snapshot file not found at ${filepath}`);
    process.exit(1);
  }

  const baselineSnapshots = JSON.parse(fs.readFileSync(filepath, 'utf8')) as Snapshot[];
  const currentSnapshots = runAllScenarios();

  let hasMismatch = false;

  currentSnapshots.forEach((curr, idx) => {
    const base = baselineSnapshots.find(b => b.scenario === curr.scenario);
    if (!base) {
      console.error(`FAIL: Scenario ${curr.scenario} missing from baseline.`);
      hasMismatch = true;
      return;
    }

    const checkEqual = (cVal: any, bVal: any, label: string) => {
      const cStr = JSON.stringify(cVal);
      const bStr = JSON.stringify(bVal);
      if (cStr !== bStr) {
        console.error(`❌ MISMATCH in Scenario [${curr.scenario}] - Field: ${label}`);
        console.error(`   Expected: ${bStr}`);
        console.error(`   Got:      ${cStr}`);
        hasMismatch = true;
      }
    };

    checkEqual(curr.finalScore, base.finalScore, 'finalScore');
    checkEqual(curr.quarterScores, base.quarterScores, 'quarterScores');
    checkEqual(curr.totals, base.totals, 'totals');
    checkEqual(curr.quarterStamina, base.quarterStamina, 'quarterStamina');
    checkEqual(curr.skillTriggers, base.skillTriggers, 'skillTriggers');
    checkEqual(curr.marksApplied, base.marksApplied, 'marksApplied');
    checkEqual(curr.eventLogCount, base.eventLogCount, 'eventLogCount');
    
    // Detailed stats check
    checkEqual(curr.playerStats, base.playerStats, 'playerStats');
  });

  if (hasMismatch) {
    console.error('\n❌ SNAPSHOT VERIFICATION FAILED! Match Engine behavior has drifted.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL SNAPSHOT SCENARIOS MATCH BASELINE EXACTLY!');
    process.exit(0);
  }
}

function generateBaseline() {
  const filepath = path.join(__dirname, 'match_engine_snapshots.json');
  const snapshots = runAllScenarios();
  fs.writeFileSync(filepath, JSON.stringify(snapshots, null, 2), 'utf8');
  console.log(`\n✅ Generated baseline snapshots successfully at ${filepath}`);
  process.exit(0);
}

// Entry point
const args = process.argv.slice(2);
if (args.includes('--verify')) {
  console.log('=== Verifying Match Engine Snapshots Against Baseline ===');
  verifySnapshots();
} else {
  console.log('=== Generating Match Engine Snapshots Baseline ===');
  generateBaseline();
}
