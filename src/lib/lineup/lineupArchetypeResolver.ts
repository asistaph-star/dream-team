import { Player } from "../types/player";
import { BaseSkillName } from "../skills/assignBaseSkills";
import { getBaseSkills, getActiveBaseSkills, getSpecialSkills } from "../skills/skillResolver";
import { resolveSpecialSkillFamily } from "../skills/skillMigration";
import { SpecialSkillFamilyId } from "../skills/skillFamilies";
import { ARCHETYPE_DEFINITIONS } from "./archetypes";
import {
  ArchetypeId,
  ArchetypeLevel,
  ArchetypeLevelLabel,
  ArchetypeResult,
  LineupArchetypeSummary,
  PlayerContribution,
} from "./types";

export function resolveLineupArchetypes(startingLineup: Player[]): LineupArchetypeSummary {
  // Guard: starting lineup is active starting 5 only.
  // We take at most 5 players (to avoid bench count if someone passed a larger array by mistake).
  const starters = startingLineup.slice(0, 5);

  // Pre-extract all player contributions & special skill families
  const playerContributions: PlayerContribution[] = starters.map((player) => {
    const allBase = getBaseSkills(player);
    const activeBase = getActiveBaseSkills(player);
    
    // The third skill is locked if OVR < 85
    const lockedGreenSkill = player.ovr < 85 && allBase.length >= 3 ? allBase[2] : null;

    // Filter to active base skills contributed by this player
    const contributedSkills = activeBase;

    return {
      playerId: player.id,
      playerName: player.name,
      contributedSkills,
      lockedGreenSkill,
    };
  });

  // Flat list of all active base skills in the starting 5 (for tracking missing skill options)
  const activeStartersBaseSkills: BaseSkillName[] = playerContributions.flatMap(
    (c) => c.contributedSkills
  );

  // Flat list of all active special skill families in the starting 5
  const activeStartersSpecialFamilies: SpecialSkillFamilyId[] = starters.flatMap((player) => {
    const specials = getSpecialSkills(player);
    return specials
      .map((s) => resolveSpecialSkillFamily(s))
      .filter((fam): fam is SpecialSkillFamilyId => fam !== null);
  });

  const results: ArchetypeResult[] = ARCHETYPE_DEFINITIONS.map((def) => {
    // 1. Calculate signals contributed for this archetype
    let signals = 0;
    const contributors: string[] = [];
    const matchingContributions: PlayerContribution[] = [];

    playerContributions.forEach((contrib) => {
      const matchingSkills = contrib.contributedSkills.filter((s) =>
        def.candidateSkills.includes(s)
      );

      const hasLockedMatch =
        contrib.lockedGreenSkill && def.candidateSkills.includes(contrib.lockedGreenSkill);

      if (matchingSkills.length > 0 || hasLockedMatch) {
        if (matchingSkills.length > 0) {
          signals += matchingSkills.length;
          contributors.push(contrib.playerName);
        }

        matchingContributions.push({
          playerId: contrib.playerId,
          playerName: contrib.playerName,
          contributedSkills: matchingSkills,
          lockedGreenSkill: hasLockedMatch ? contrib.lockedGreenSkill : null,
        });
      }
    });

    const distinctContributorCount = contributors.length;

    // 2. Determine Archetype Level
    let level: ArchetypeLevel = 0;
    let levelLabel: ArchetypeLevelLabel = "None";

    if (signals >= 7 && distinctContributorCount >= 3) {
      level = 3;
      levelLabel = "Gold";
    } else if (signals >= 5) {
      level = 2;
      levelLabel = "Silver";
    } else if (signals >= 3) {
      level = 1;
      levelLabel = "Bronze";
    }

    // 3. Required signals for next level
    let requiredSignalsForNextLevel = 0;
    if (level === 0) {
      requiredSignalsForNextLevel = 3 - signals;
    } else if (level === 1) {
      requiredSignalsForNextLevel = 5 - signals;
    } else if (level === 2) {
      // If we have >= 7 signals but < 3 contributors, we are stuck at level 2.
      // In this case, 0 signals are required, but contributor requirements must be met.
      requiredSignalsForNextLevel = Math.max(0, 7 - signals);
    }

    // 4. Missing signal options (candidate skills not active in starters)
    const missingSignalOptions = def.candidateSkills.filter(
      (s) => !activeStartersBaseSkills.includes(s)
    );

    // 5. Matching enhancers currently in starters
    const matchingEnhancers = def.enhancers.filter((enh) =>
      activeStartersSpecialFamilies.includes(enh)
    );

    return {
      id: def.id,
      displayName: def.displayName,
      level,
      levelLabel,
      signalCount: signals,
      requiredSignalsForNextLevel,
      contributingPlayers: contributors,
      playerContributions: matchingContributions,
      missingSignalOptions,
      matchingEnhancers,
    };
  });

  // Sort results by level descending, then signal count descending
  const sorted = [...results].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.signalCount - a.signalCount;
  });

  // Primary active archetype: highest level, or if levels are 0, the one with highest signal count >= 1
  let primary: ArchetypeResult | null = null;
  let secondary: ArchetypeResult | null = null;

  if (sorted.length > 0) {
    const first = sorted[0];
    if (first.level > 0 || first.signalCount > 0) {
      primary = first;
    }
    
    const second = sorted[1];
    if (second && (second.level > 0 || second.signalCount > 0)) {
      secondary = second;
    }
  }

  return {
    primary,
    secondary,
    allResults: sorted,
  };
}
