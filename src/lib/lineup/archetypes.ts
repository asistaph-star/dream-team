import { ArchetypeDefinition } from "./types";

export const ARCHETYPE_DEFINITIONS: ArchetypeDefinition[] = [
  {
    id: "stamina-drain",
    displayName: "Stamina Drain Lineup",
    candidateSkills: [
      "Paint Magnet",
      "Power Driver",
      "Screen Breaker",
      "Shadow Guard",
      "Hands Active",
      "Discipline Wall",
      "Focus Lock",
      "Iron Motor",
      "Enforcer Lift"
    ],
    enhancers: ["DEFENSIVE_ANCHOR", "LOCK_CHAIN", "SKY_WALL", "GAMEPLAN_JAMMER"]
  },
  {
    id: "foul-draw",
    displayName: "Flop / Foul-Draw Lineup",
    candidateSkills: [
      "Foul Magnet",
      "Power Driver",
      "Tempo Surgeon",
      "Mismatch Caller",
      "Paint Magnet",
      "Focus Lock",
      "Complete Engine"
    ],
    enhancers: ["FLOP", "DEEP_STRIKE", "COMPOSURE_SHIELD"]
  },
  {
    id: "playmaking",
    displayName: "Light Bulb / Playmaking Lineup",
    candidateSkills: [
      "Tempo Surgeon",
      "Connector Hub",
      "Share Rhythm",
      "Complete Engine",
      "Tempo Switch",
      "Position Flex",
      "Future Core"
    ],
    enhancers: ["COURT_VISION_ENGINE", "BENCH_CAPTAIN", "MOMENTUM_SWING", "TIMEOUT_RESET"]
  },
  {
    id: "shooting",
    displayName: "Deep Strike / Shooting Lineup",
    candidateSkills: [
      "Arc Pressure",
      "Tempo Surgeon",
      "Mismatch Caller",
      "Tempo Switch",
      "Connector Hub",
      "Complete Engine",
      "Position Flex"
    ],
    enhancers: ["DEEP_STRIKE", "COURT_VISION_ENGINE", "MOMENTUM_SWING"]
  },
  {
    id: "rebound",
    displayName: "Glass Bully / Rebound Lineup",
    candidateSkills: [
      "Glass Touch",
      "Paint Barrier",
      "Paint Magnet",
      "Power Driver",
      "Rim Warden",
      "Iron Motor",
      "Enforcer Lift"
    ],
    enhancers: ["GLASS_STRIKE", "POSTER_SPARK", "SKY_WALL"]
  },
  {
    id: "paint-bully",
    displayName: "Paint Bully Lineup",
    candidateSkills: [
      "Paint Magnet",
      "Power Driver",
      "Mismatch Caller",
      "Glass Touch",
      "Rim Warden",
      "Enforcer Lift",
      "Iron Motor"
    ],
    enhancers: ["POSTER_SPARK", "FLOP", "BROKEN_PLAY_RESCUE", "SKY_WALL"]
  },
  {
    id: "gameplan",
    displayName: "Anti-Meta / Gameplan Lineup",
    candidateSkills: [
      "Discipline Wall",
      "Focus Lock",
      "Shadow Guard",
      "Screen Breaker",
      "Complete Engine",
      "Position Flex",
      "Future Core"
    ],
    enhancers: ["GAMEPLAN_JAMMER", "COMPOSURE_SHIELD", "CLEAN_CHALLENGE", "TIMEOUT_RESET"]
  }
];
