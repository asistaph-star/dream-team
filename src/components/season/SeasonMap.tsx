"use client";

import React, { useState } from 'react';
import { useGameState } from '@/lib/context/GameStateContext';
import { mockAiTeams } from '@/lib/utils/matchEngine';
import { Play, Lock, MapPin, ChevronLeft } from 'lucide-react';
import { usaStatePaths } from './UsaPaths';

import { Difficulty } from '@/lib/utils/matchTypes';

interface Stage {
  id: number;
  name: string;
  difficulty: Difficulty;
  teamId: string;
  teamAbbr: string;
  stateCode: string;
  region: 'EAST' | 'WEST';
}

// Accurate mathematical state-center coordinates (calculated via script relative to the USA map SVG container)
const TEAM_MAP_LOCATIONS: Record<string, { x: number; y: number; labelOffsetX: number; labelOffsetY: number }> = {
  okc:  { x: 45.2, y: 60.9, labelOffsetX: 0, labelOffsetY: -60 },   // Oklahoma City (OK)
  cle:  { x: 73.0, y: 40.0, labelOffsetX: 0, labelOffsetY: -60 },   // Cleveland, OH (OH)
  gsw:  { x: 9.5,  y: 46.5, labelOffsetX: 0, labelOffsetY: -60 },   // Golden State (CA)
  mem:  { x: 68.5, y: 57.7, labelOffsetX: 0, labelOffsetY: -60 },   // Memphis, TN (TN)
  hou:  { x: 42.2, y: 76.3, labelOffsetX: 0, labelOffsetY: -60 },   // Houston, TX (TX)
  det:  { x: 64.2, y: 24.4, labelOffsetX: 0, labelOffsetY: -60 },   // Detroit, MI (MI)
  phx:  { x: 20.3, y: 61.7, labelOffsetX: 0, labelOffsetY: -60 },   // Phoenix, AZ (AZ)
  nyk:  { x: 84.2, y: 26.4, labelOffsetX: 0, labelOffsetY: -60 },   // New York City, NY (NY)
  sac:  { x: 9.5,  y: 46.5, labelOffsetX: 0, labelOffsetY: -60 },   // Sacramento, CA (CA)
  wsh:  { x: 83.6, y: 42.6, labelOffsetX: 0, labelOffsetY: -60 },   // Washington, DC (DC)
  atl:  { x: 74.5, y: 68.3, labelOffsetX: 0, labelOffsetY: -60 },   // Atlanta, GA (GA)
  sas:  { x: 42.2, y: 76.3, labelOffsetX: 0, labelOffsetY: -60 },   // San Antonio, TX (TX)
  lal:  { x: 9.5,  y: 46.5, labelOffsetX: 0, labelOffsetY: -60 },   // Los Angeles, CA (CA)
  chi:  { x: 61.6, y: 44.0, labelOffsetX: 0, labelOffsetY: -60 },   // Chicago, IL (IL)
  mia:  { x: 75.1, y: 86.2, labelOffsetX: 0, labelOffsetY: -60 },   // Miami, FL (FL)
  bos:  { x: 84.8, y: 24.1, labelOffsetX: 0, labelOffsetY: -60 },   // Boston (MA)
  mil:  { x: 62.0, y: 31.0, labelOffsetX: 0, labelOffsetY: -60 },   // Milwaukee (WI)
  dal:  { x: 44.0, y: 70.0, labelOffsetX: 0, labelOffsetY: -60 },   // Dallas (TX)
  min:  { x: 50.0, y: 22.0, labelOffsetX: 0, labelOffsetY: -60 },   // Minnesota (MN)
  phi:  { x: 81.5, y: 31.2, labelOffsetX: 0, labelOffsetY: -60 },   // Philadelphia (PA)
  usa:  { x: 50.0, y: 48.0, labelOffsetX: 0, labelOffsetY: -60 },   // USA (KS center)
  den:  { x: 30.5, y: 42.0, labelOffsetX: 0, labelOffsetY: -60 },   // Denver (CO)
};

const STAGES: Stage[] = [
  { id: 1,  name: "OKC Thunder",           difficulty: 'EASY',        teamId: 'EASY',        teamAbbr: 'okc', stateCode: 'OK', region: 'WEST' },
  { id: 2,  name: "Cleveland Cavaliers",   difficulty: 'EASY',        teamId: 'EASY',        teamAbbr: 'cle', stateCode: 'OH', region: 'EAST' },
  { id: 3,  name: "Golden State Warriors", difficulty: 'EASY',        teamId: 'EASY',        teamAbbr: 'gsw', stateCode: 'CA', region: 'WEST' },
  { id: 4,  name: "Memphis Grizzlies",     difficulty: 'NORMAL',      teamId: 'NORMAL',      teamAbbr: 'mem', stateCode: 'TN', region: 'WEST' },
  { id: 5,  name: "Houston Rockets",       difficulty: 'NORMAL',      teamId: 'NORMAL',      teamAbbr: 'hou', stateCode: 'TX', region: 'WEST' },
  { id: 6,  name: "Detroit Pistons",       difficulty: 'NORMAL',      teamId: 'NORMAL',      teamAbbr: 'det', stateCode: 'MI', region: 'EAST' },
  { id: 7,  name: "Phoenix Suns",          difficulty: 'NORMAL',      teamId: 'NORMAL',      teamAbbr: 'phx', stateCode: 'AZ', region: 'WEST' },
  { id: 8,  name: "NY Knicks",             difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'nyk', stateCode: 'NY', region: 'EAST' },
  { id: 9,  name: "Sacramento Kings",      difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'sac', stateCode: 'CA', region: 'WEST' },
  { id: 10, name: "Houston Rockets",       difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'hou', stateCode: 'TX', region: 'WEST' },
  { id: 11, name: "Washington Wizards",    difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'wsh', stateCode: 'DC', region: 'EAST' },
  { id: 12, name: "Atlanta Hawks",         difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'atl', stateCode: 'GA', region: 'EAST' },
  { id: 13, name: "Cleveland Cavaliers",   difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'cle', stateCode: 'OH', region: 'EAST' },
  { id: 14, name: "San Antonio Spurs",     difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'sas', stateCode: 'TX', region: 'WEST' },
  { id: 15, name: "LA Lakers",             difficulty: 'HARD',        teamId: 'HARD',        teamAbbr: 'lal', stateCode: 'CA', region: 'WEST' },
  { id: 16, name: "Boston Celtics",        difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'bos', stateCode: 'MA', region: 'EAST' },
  { id: 17, name: "Milwaukee Bucks",       difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'mil', stateCode: 'WI', region: 'EAST' },
  { id: 18, name: "Dallas Mavericks",      difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'dal', stateCode: 'TX', region: 'WEST' },
  { id: 19, name: "Minnesota Wolves",      difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'min', stateCode: 'MN', region: 'WEST' },
  { id: 20, name: "Philadelphia 76ers",    difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'phi', stateCode: 'PA', region: 'EAST' },
  { id: 21, name: "Portland Trail Blazers",difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'okc', stateCode: 'OR', region: 'WEST' },
  { id: 22, name: "Denver Nuggets",        difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'den', stateCode: 'CO', region: 'WEST' },
  { id: 23, name: "Miami Heat",            difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'mia', stateCode: 'FL', region: 'EAST' },
  { id: 24, name: "Phoenix Suns",          difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'phx', stateCode: 'AZ', region: 'WEST' },
  { id: 25, name: "Golden State Warriors", difficulty: 'EXPERT',      teamId: 'EXPERT',      teamAbbr: 'gsw', stateCode: 'CA', region: 'WEST' },
  { id: 26, name: "Dream Team Alpha",      difficulty: 'HELL_EXPERT', teamId: 'HELL_EXPERT', teamAbbr: 'usa', stateCode: 'NY', region: 'EAST' },
  { id: 27, name: "Dream Team Beta",       difficulty: 'HELL_EXPERT', teamId: 'HELL_EXPERT', teamAbbr: 'usa', stateCode: 'CA', region: 'WEST' },
  { id: 28, name: "Dream Team Gamma",      difficulty: 'HELL_EXPERT', teamId: 'HELL_EXPERT', teamAbbr: 'usa', stateCode: 'TX', region: 'WEST' },
  { id: 29, name: "Dream Team Delta",      difficulty: 'HELL_EXPERT', teamId: 'HELL_EXPERT', teamAbbr: 'usa', stateCode: 'IL', region: 'EAST' },
  { id: 30, name: "Dream Team Omega",      difficulty: 'HELL_EXPERT', teamId: 'HELL_EXPERT', teamAbbr: 'usa', stateCode: 'FL', region: 'EAST' },
];

const getTeamLogoUrl = (name: string) => {
  const map: Record<string, string> = {
    "Detroit Pistons": "det", "Miami Heat": "mia", "Chicago Bulls": "chi",
    "NY Knicks": "nyk", "LA Lakers": "lal", "Golden State Warriors": "gsw",
    "OKC Thunder": "okc", "Cleveland Cavaliers": "cle", "Memphis Grizzlies": "mem",
    "Houston Rockets": "hou", "Phoenix Suns": "phx", "Sacramento Kings": "sac",
    "Washington Wizards": "wsh", "Atlanta Hawks": "atl", "San Antonio Spurs": "sas",
    "Boston Celtics": "bos", "Milwaukee Bucks": "mil", "Dallas Mavericks": "dal",
    "Minnesota Wolves": "min", "Philadelphia 76ers": "phi", "Denver Nuggets": "den",
    "Portland Trail Blazers": "por", "USA Dream Team": "usa", "Dream Team": "usa",
    "Dream Team Alpha": "usa", "Dream Team Beta": "usa", "Dream Team Gamma": "usa",
    "Dream Team Delta": "usa", "Dream Team Omega": "usa"
  };
  const abbr = map[name] || "nba";
  return `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`;
};

interface SeasonMapProps {
  onStartMatch: (difficulty: Difficulty, opponentName?: string) => void;
  onBack: () => void;
}

export const SeasonMap: React.FC<SeasonMapProps> = ({ onStartMatch, onBack }) => {
  const { campaignStage, activeLineup } = useGameState();
  const [sandboxDiff, setSandboxDiff] = useState<Difficulty | null>(null);
  const injuredStarters = activeLineup.filter(p => p.isInjured);
  const hasInjuredStarters = injuredStarters.length > 0;
  
  const currentStageInfo = STAGES.find(s => s.id === campaignStage) || STAGES[STAGES.length - 1];
  const teamInfo = currentStageInfo ? mockAiTeams[currentStageInfo.difficulty] : null;

  return (
    <div className="absolute inset-0 w-full h-full z-50 bg-[#070b13] flex flex-col font-sans overflow-hidden">
      {/* Space & Earth Background */}
      <div className="absolute inset-0 z-0 bg-[#02040a] overflow-hidden">
        {/* Starfield with slow rotation for universe movement */}
        <div className="absolute inset-[-50%] w-[200%] h-[200%] animate-[spin_240s_linear_infinite] pointer-events-none z-0">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,#ffffff15_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,#ffffff20_1px,transparent_1px)] bg-[size:100px_100px] bg-[position:12px_12px]" />
        </div>
        
        {/* Nebula / Cosmic Dust */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] bg-sky-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Big Lens Flare Star (Top Right) */}
        <div className="absolute top-[9vh] right-[18%] w-48 h-48 flex items-center justify-center pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]">
           <div className="absolute w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_8px_4px_rgba(255,255,255,0.9),0_0_20px_8px_rgba(200,230,255,0.4)]" />
           <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
           <div className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-80" />
        </div>
        
        {/* Medium Lens Flare Star (Top Center-Left) */}
        <div className="absolute top-[7vh] left-[42%] w-24 h-24 flex items-center justify-center pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]">
           <div className="absolute w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_6px_3px_rgba(255,255,255,0.8),0_0_14px_6px_rgba(180,220,255,0.3)]" />
           <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-60" />
           <div className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-60" />
        </div>

        {/* Small pinpoint stars — sharp 1px dots with glow shadow, NO blur */}
        <div className="absolute top-[7vh]  right-[8%]  w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.8)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-[10vh] right-[25%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.7)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[13vh] right-[6%]  w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_2px_rgba(255,255,255,0.6)] pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]" />
        <div className="absolute top-[8vh]  right-[38%] w-[2px] h-[2px] bg-sky-100 rounded-full shadow-[0_0_4px_2px_rgba(180,220,255,0.8)] pointer-events-none z-0 animate-[pulse_2s_ease-in-out_infinite]" />
        <div className="absolute top-[11vh] right-[32%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.7)] pointer-events-none z-0 animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[9vh]  left-[8%]  w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.8)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[7vh]  left-[18%] w-[1px] h-[1px] bg-sky-100 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.7)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-[13vh] left-[22%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.6)] pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]" />
        <div className="absolute top-[12vh] left-[5%]  w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.9)] pointer-events-none z-0 animate-pulse" />
        <div className="absolute top-[8vh]  left-[35%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_2px_rgba(255,255,255,0.5)] pointer-events-none z-0 animate-[pulse_7s_ease-in-out_infinite]" />
        <div className="absolute top-[14vh] right-[20%] w-[1px] h-[1px] bg-sky-200 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.6)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[6.5vh] right-[48%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.7)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />

        {/* === FILL GAPS: Left Zone === */}
        <div className="absolute top-[6.5vh] left-[2%]  w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_2px_rgba(255,255,255,0.7)] pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]" />
        <div className="absolute top-[10vh] left-[2%]  w-[2px] h-[2px] bg-sky-100 rounded-full shadow-[0_0_4px_2px_rgba(180,220,255,0.6)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-[14vh] left-[12%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.8)] pointer-events-none z-0 animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[8vh]  left-[27%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.9)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[11vh] left-[14%] w-[1px] h-[1px] bg-sky-200 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.5)] pointer-events-none z-0 animate-pulse" />
        <div className="absolute top-[6.8vh] left-[30%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.6)] pointer-events-none z-0 animate-[pulse_7s_ease-in-out_infinite]" />

        {/* === FILL GAPS: Center Zone === */}
        <div className="absolute top-[7.5vh] left-[50%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.8)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-[12vh] left-[53%] w-[1px] h-[1px] bg-sky-100 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.7)] pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]" />
        <div className="absolute top-[9.5vh] left-[58%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.9)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[14vh] left-[60%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.6)] pointer-events-none z-0 animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[7vh]  left-[65%] w-[1px] h-[1px] bg-sky-200 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.5)] pointer-events-none z-0 animate-pulse" />
        <div className="absolute top-[11vh] left-[70%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.7)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-[13vh] left-[55%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.8)] pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]" />

        {/* === FILL GAPS: Right Zone === */}
        <div className="absolute top-[6.8vh] right-[3%]  w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.8)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[11vh] right-[3%]  w-[1px] h-[1px] bg-sky-100 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.7)] pointer-events-none z-0 animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[8.5vh] right-[14%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.9)] pointer-events-none z-0 animate-pulse" />
        <div className="absolute top-[13.5vh] right-[15%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_4px_2px_rgba(255,255,255,0.6)] pointer-events-none z-0 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-[10vh] right-[7%]  w-[1px] h-[1px] bg-sky-200 rounded-full shadow-[0_0_3px_2px_rgba(180,220,255,0.5)] pointer-events-none z-0 animate-[pulse_5s_ease-in-out_infinite]" />
        <div className="absolute top-[7.5vh] right-[52%] w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_3px_1px_rgba(255,255,255,0.7)] pointer-events-none z-0 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[12.5vh] right-[58%] w-[2px] h-[2px] bg-sky-100 rounded-full shadow-[0_0_4px_2px_rgba(180,220,255,0.6)] pointer-events-none z-0 animate-[pulse_7s_ease-in-out_infinite]" />
               {/* Outer Atmospheric Rim Glow (halo outside the sphere) */}
        <div className="absolute top-[15vh] left-1/2 -translate-x-1/2 w-[182vw] h-[182vw] rounded-[50%] pointer-events-none"
          style={{ boxShadow: '0 0 60px 20px rgba(56,182,255,0.12), 0 0 120px 40px rgba(30,100,200,0.08)' }}
        />

        {/* The Earth Globe */}
        <div className="absolute top-[15vh] left-1/2 -translate-x-1/2 w-[180vw] h-[180vw] rounded-[50%] pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 35% 30%, #1a3a5c 0%, #0d1f35 25%, #06111e 50%, #020a14 70%, #000000 100%)',
            boxShadow: 'inset 0 0 200px 80px rgba(0,0,0,0.95), inset -60px -60px 200px rgba(0,0,0,0.8)',
          }}
        >
          {/* Globe latitude/longitude grid — fades toward edges for curvature illusion */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(100,180,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,180,255,0.07) 1px, transparent 1px)',
              backgroundSize: '6% 4%',
              maskImage: 'radial-gradient(ellipse 70% 55% at 50% 20%, white 10%, rgba(255,255,255,0.4) 50%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 20%, white 10%, rgba(255,255,255,0.4) 50%, transparent 80%)',
            }}
          />

          {/* Specular highlight — bright reflection top-left like a real sphere */}
          <div className="absolute rounded-[50%] pointer-events-none"
            style={{
              top: '2%', left: '30%',
              width: '30%', height: '15%',
              background: 'radial-gradient(ellipse at center, rgba(180,220,255,0.25) 0%, rgba(100,180,255,0.08) 50%, transparent 100%)',
              filter: 'blur(8px)',
            }}
          />

          {/* Limb Darkening — edges of the sphere go pitch black */}
          <div className="absolute inset-0 rounded-[50%] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 45% 25%, transparent 30%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.97) 80%)',
            }}
          />

          {/* Bottom shadow — lower half of globe is very dark */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.95) 85%)' }}
          />
        </div>

        
        {/* USA Map Container */}
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 mt-6 w-[900px] h-[550px] opacity-90 pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 959 593" preserveAspectRatio="none" className="absolute inset-0 w-full h-full drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)] drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
              <defs>
                {/* Chaotic Data Mesh Pattern for the map (no circles, no stars) */}
                <pattern id="network" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M-10 20L50 -10 M-10 50L50 20 M20 -10L50 50 M-10 -10L20 50 M-10 10L50 30 M10 -10L30 50 M-10 30L50 10 M30 -10L10 50" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" fill="none"/>
                  <path d="M0 0L40 40 M40 0L0 40" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" fill="none"/>
                </pattern>
              </defs>
              
              {/* Render translucent background for states first */}
              <g>
                {Object.entries(usaStatePaths).map(([code, d]) => (
                  <path key={`bg_${code}`} d={d} fill="rgba(0, 0, 0, 0.25)" />
                ))}
              </g>

              {/* Render pattern overlay */}
              <g>
                {Object.entries(usaStatePaths).map(([code, d]) => (
                  <path key={`pat_${code}`} d={d} fill="url(#network)" />
                ))}
              </g>

              {/* Render thick grey borders and active state highlights */}
              <g>
                {Object.entries(usaStatePaths).map(([code, d]) => {
                  const isActiveState = currentStageInfo?.stateCode === code;
                  const isWest = currentStageInfo?.region === 'WEST';
                  const activeColor = isWest ? 'rgba(239, 68, 68,' : 'rgba(59, 130, 246,';
                  return (
                    <path 
                      key={`border_${code}`} 
                      d={d} 
                      fill={isActiveState ? `${activeColor} 0.4)` : 'transparent'} 
                      stroke={isActiveState ? `${activeColor} 0.9)` : '#94a3b8'} 
                      strokeWidth={isActiveState ? 3 : 2} 
                      className="transition-colors duration-500"
                      style={{ filter: isActiveState ? 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' : 'drop-shadow(0 0 2px rgba(148,163,184,0.3))' }}
                    />
                  );
                })}
              </g>
            </svg>
            
            {/* Single Opponent Marker */}
            {(() => {
              if (!currentStageInfo) return null;
              const loc = TEAM_MAP_LOCATIONS[currentStageInfo.teamAbbr];
              if (!loc) {
                console.warn(`[SeasonMap] Missing map location for team: ${currentStageInfo.teamAbbr} (${currentStageInfo.name})`);
                return null;
              }
              return (
                <div 
                  className="absolute z-30 flex flex-col items-center justify-end"
                  style={{ 
                    left: `${loc.x}%`, 
                    top: `${loc.y}%`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  {/* Floating Emblem */}
                  <div className={`relative w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl z-20 ${currentStageInfo.region === 'WEST' ? 'bg-red-900 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]' : 'bg-blue-900 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]'}`}>
                    {/* 3D sphere effect overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                    <span className="text-white text-xs font-black uppercase tracking-widest text-center leading-tight drop-shadow-md px-2">
                      {currentStageInfo.name.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
                    </span>
                  </div>
                  
                  {/* Vertical Beam */}
                  <div className={`w-1 h-16 -mt-2 z-10 ${currentStageInfo.region === 'WEST' ? 'bg-gradient-to-b from-red-400 to-transparent' : 'bg-gradient-to-b from-blue-400 to-transparent'}`} />
                  
                  {/* Base Radar / Ground Ring */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-8 flex items-center justify-center pointer-events-none">
                    <div className={`absolute w-full h-full rounded-[50%] border-2 animate-ping ${currentStageInfo.region === 'WEST' ? 'border-red-500/60 bg-red-500/20' : 'border-blue-500/60 bg-blue-500/20'}`} />
                    <div className={`absolute w-10 h-5 rounded-[50%] border ${currentStageInfo.region === 'WEST' ? 'border-red-400 bg-red-500/40' : 'border-blue-400 bg-blue-500/40'}`} />
                    <div className={`absolute w-2 h-1 rounded-[50%] ${currentStageInfo.region === 'WEST' ? 'bg-red-200 shadow-[0_0_10px_rgba(255,255,255,1)]' : 'bg-blue-200 shadow-[0_0_10px_rgba(255,255,255,1)]'}`} />
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <div className="relative z-50 w-full flex flex-col pt-1">
        
        {/* ROW 1: Top bar — Back button left, Currency right */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between pl-4 h-12">
            <button onClick={onBack} className="flex items-center text-white hover:text-gray-300 transition-colors cursor-pointer drop-shadow-md">
              <ChevronLeft size={36} strokeWidth={3} className="-ml-1 mr-2" />
              <span className="text-[26px] font-bold text-white drop-shadow-md tracking-wide leading-none pt-1">Season</span>
            </button>

            <div className="flex items-center h-full">
              <div className="flex items-center h-full pl-8 pr-4" style={{ background: 'linear-gradient(110deg, transparent 15px, rgba(255,255,255,0.2) 15px, rgba(60,60,60,0.9) 16px)' }}>
                 <span className="text-2xl drop-shadow-md -mt-1">💎</span>
                 <span className="text-white font-bold text-lg px-2 w-16 text-center">776</span>
                 <button className="w-6 h-6 bg-transparent flex items-center justify-center border-none ml-2 hover:opacity-80">
                   <span className="text-white text-3xl font-black drop-shadow-md">+</span>
                 </button>
              </div>
            </div>
          </div>
          
          {/* Fading white line below the header */}
          <div className="w-full h-[2px] bg-gradient-to-r from-white via-white/30 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>

        {hasInjuredStarters && (
          <div className="mx-4 mt-2 px-4 py-2.5 bg-red-950/80 border border-red-500/40 rounded-lg flex items-center gap-2 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <span className="text-red-400 font-extrabold text-[11px] tracking-widest uppercase">⚠️ ROSTER ALERT:</span>
            <span className="text-[11px] font-semibold text-gray-200">
              Starting lineup contains injured players: <b className="text-white underline">{injuredStarters.map(p => p.name).join(', ')}</b>.
              Please go to the SQUAD screen to swap them before entering the match!
            </span>
          </div>
        )}

        {/* MAIN LAYOUT: Left Column (Button + Quest) and Right Column (Timeline + Chat) */}
        <div className="grid grid-cols-[360px_1fr] gap-4 px-4 mt-2 items-start w-full">
          
          {/* Left Column Container */}
          <div className="w-[360px] shrink-0 flex flex-col gap-3 items-stretch">
            {/* Season pill */}
            <button className="w-full h-[50px] relative flex items-center justify-center bg-[#8b3a1a] rounded-[24px] shadow-[0_0_20px_rgba(249,115,22,0.8)] z-20" style={{ outline: '2px solid #ff5a00', outlineOffset: '-1px' }}>
               <span className="text-orange-300/50 text-sm font-black absolute left-6">&lt;</span>
               <span className="text-white font-black text-[19px] tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">S1 Season</span>
               <span className="text-orange-300/50 text-sm font-black absolute right-6">&gt;</span>
            </button>

            {/* Quest Panel */}
            <div className="w-full h-[72px] rounded-md border border-[#4a4a4a] bg-[#424242] relative shadow-lg flex items-center">
              {/* Orange Glowing Dot Notification */}
              <div className="absolute -top-[6px] -right-[6px] w-3.5 h-3.5 bg-gradient-to-br from-[#ffda00] to-[#ff4400] rounded-full shadow-[0_0_10px_#ff8800] z-20" />
              
              {/* Left Dark Block */}
              <div className="w-[80px] h-full bg-[#1e1e1e] rounded-l-md flex items-center justify-center relative shrink-0">
                {/* Custom Tablet/User Icon */}
                <div className="text-gray-500 opacity-70">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                     <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4zm1 2h14v8H5V8zm-1.5 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-3 5.5a3.5 3.5 0 0 1 6 0H9z"/>
                  </svg>
                </div>
              </div>

              {/* Left-pointing arrow of the light gray block */}
              <div className="w-0 h-0 border-y-[14px] border-y-transparent border-r-[14px] border-r-[#424242] absolute left-[70px] z-10" />

              {/* Right Light Block Text Content */}
              <div className="pl-8 pr-4 flex flex-col justify-center h-full pb-0.5 relative z-10 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-[4px]">
                  <span className="text-[#f98b2e] font-black text-[16px] tracking-tight leading-none">[Main Quest]</span>
                  <span className="text-[#20c976] font-bold text-[16px] tracking-wide leading-none">Board</span>
                </div>
                <span className="text-[#dcdcdc] text-[12px] tracking-wide font-medium leading-tight">
                  Continue to win the regular season {Math.min(campaignStage - 1, STAGES.length)}/{STAGES.length} matches
                </span>
              </div>
            </div>
          </div>

          {/* Right Column Container */}
          <div className="min-w-0 flex flex-col gap-3">
            {/* Timeline Viewport — fixed width, clipped */}
            <div
              className="relative h-[50px] overflow-hidden border-y border-l border-[#444] shadow-inner"
              style={{
                width: '760px',
                maxWidth: 'calc(100vw - 420px)',
                background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 8px, rgba(0,0,0,0.18) 8px, rgba(0,0,0,0.18) 16px)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 90px), transparent 100%)',
                maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 90px), transparent 100%)'
              }}
            >
              {/* Inner Sliding Track */}
              <div
                className="flex h-full w-max items-center gap-2 transition-transform duration-[350ms] ease-out"
                style={{ transform: `translateX(-${Math.max(0, campaignStage - 2) * 60}px)` }}
              >
                {STAGES.map((stage, idx) => {
                  const isCurrent = idx === campaignStage - 1;
                  const isPassed = idx < campaignStage - 1;

                  return (
                    <div
                      key={stage.id}
                      className="relative flex h-[50px] w-[52px] shrink-0 items-center justify-center bg-black border border-[#111]"
                    >
                      <img
                        src={getTeamLogoUrl(stage.name)}
                        alt={stage.name}
                        className={`h-[34px] w-[34px] object-contain transition-all ${isPassed ? 'grayscale opacity-80' : ''}`}
                      />
                      
                      {/* Win Overlay for beaten teams */}
                      {isPassed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
                          <span className="text-[#20c976] font-black italic text-[24px] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                            W
                          </span>
                        </div>
                      )}

                      {/* Current Active Stage Indicator */}
                      {isCurrent && (
                        <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Chat Button aligned right */}
            <div className="flex justify-end pr-1">
              <button className="w-10 h-[34px] bg-[#1a1a1a] border border-[#555] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] hover:bg-[#222] transition-colors cursor-pointer">
                <div className="w-[18px] h-[13px] bg-white rounded-sm relative flex items-center justify-center">
                  <div className="flex gap-[2px]">
                    <div className="w-[2px] h-[2px] bg-black rounded-full" />
                    <div className="w-[2px] h-[2px] bg-black rounded-full" />
                    <div className="w-[2px] h-[2px] bg-black rounded-full" />
                  </div>
                  {/* Chat tail */}
                  <div className="absolute -bottom-[3px] right-[2px] w-0 h-0 border-l-[3px] border-t-[4px] border-l-transparent border-t-white" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right — NBA 2K Style Match Card */}
      <div className="absolute bottom-10 right-12 z-30 group">
        
        {/* Slanted Card Container */}
        <div className="relative w-[320px] bg-gradient-to-br from-[#1a1a1c] to-[#0a0a0a] border-r-[4px] border-r-orange-600 shadow-[0_15px_35px_rgba(0,0,0,0.7)] -skew-x-[8deg] overflow-hidden transition-transform duration-300 hover:-translate-y-1">
          
          {/* Subtle Carbon Fiber / Halftone background effect */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
          
          {/* Opponent Logo watermark (skew corrected) */}
          {(() => {
            const activeDiff = sandboxDiff || currentStageInfo?.difficulty || 'EASY';
            const activeTeamInfo = mockAiTeams[activeDiff];
            const activeTeamName = sandboxDiff ? activeTeamInfo.name : (currentStageInfo?.name || 'SEASON COMPLETE');
            return (
              <div className="absolute -right-8 -bottom-8 w-32 h-32 opacity-15 pointer-events-none transition-all duration-300 group-hover:scale-110 group-hover:opacity-25" style={{ transform: 'skewX(8deg)' }}>
                <img 
                  src={getTeamLogoUrl(activeTeamName)} 
                  alt="Opponent Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            );
          })()}

          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-orange-500 to-orange-600" />
          
          {/* Content Wrapper (un-skewed for readable text) */}
          <div className="px-6 py-4 skew-x-[8deg] relative z-10">
            
            {/* Header / Label / Mode Toggle */}
            <div className="flex items-center justify-between mb-3 text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <div className="font-black italic uppercase tracking-[0.2em] text-orange-400 drop-shadow-md">
                  {sandboxDiff ? 'SANDBOX MATCH' : 'NEXT MATCH'}
                </div>
              </div>
            </div>

            {/* Mode Toggle Buttons */}
            <div className="flex bg-black/50 p-0.5 rounded border border-gray-800/80 mb-3 text-[10px] font-black tracking-wider">
              <button 
                onClick={() => setSandboxDiff(null)}
                className={`flex-1 py-1 text-center transition-all duration-200 cursor-pointer rounded-sm ${!sandboxDiff ? 'bg-orange-600/90 text-white font-black italic shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                CAMPAIGN
              </button>
              <button 
                onClick={() => setSandboxDiff('EASY')}
                className={`flex-1 py-1 text-center transition-all duration-200 cursor-pointer rounded-sm ${sandboxDiff ? 'bg-indigo-600/90 text-white font-black italic shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                SANDBOX
              </button>
            </div>

            {/* Sandbox Difficulty Selection Grid */}
            {sandboxDiff && (
              <div className="flex flex-col gap-1.5 mb-3.5 bg-black/35 p-2 rounded border border-gray-800/40">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-0.5">SELECT DIFFICULTY:</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['EASY', 'NORMAL', 'HARD', 'EXPERT', 'HELL_EXPERT', 'DREAM_TEAM'] as Difficulty[]).map((d) => {
                    const active = sandboxDiff === d;
                    const diffColors: Record<Difficulty, string> = {
                      EASY: 'border-green-500/20 text-green-400 hover:bg-green-500/10 hover:border-green-500/40',
                      NORMAL: 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40',
                      HARD: 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40',
                      EXPERT: 'border-green-600/20 text-green-300 hover:bg-green-600/10 hover:border-green-600/40',
                      HELL_EXPERT: 'border-red-600/20 text-red-400 hover:bg-red-600/10 hover:border-red-600/40',
                      DREAM_TEAM: 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40'
                    };
                    const activeBg: Record<Difficulty, string> = {
                      EASY: 'bg-green-950/80 border-green-500 text-green-300 shadow-[0_0_8px_rgba(34,197,94,0.4)] font-extrabold',
                      NORMAL: 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.4)] font-extrabold',
                      HARD: 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)] font-extrabold',
                      EXPERT: 'bg-green-900/80 border-green-500 text-green-200 shadow-[0_0_8px_rgba(22,101,52,0.4)] font-extrabold',
                      HELL_EXPERT: 'bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_8px_rgba(220,38,38,0.4)] font-extrabold',
                      DREAM_TEAM: 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)] font-extrabold'
                    };

                    return (
                      <button
                        key={d}
                        onClick={() => setSandboxDiff(d)}
                        className={`text-[9px] font-bold py-1 border rounded transition-all text-center leading-tight cursor-pointer ${active ? activeBg[d] : `border-gray-800 text-gray-400 bg-black/20 ${diffColors[d]}`}`}
                      >
                        {d.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Matchup Team Name */}
            {(() => {
              const activeDiff = sandboxDiff || currentStageInfo?.difficulty || 'EASY';
              const activeTeamInfo = mockAiTeams[activeDiff];
              const activeTeamName = sandboxDiff ? activeTeamInfo.name : (currentStageInfo?.name || 'SEASON COMPLETE');
              const isCompleted = !sandboxDiff && campaignStage > STAGES.length;

              return (
                <>
                  <div className="text-[24px] font-black italic uppercase text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)] leading-none mt-1 truncate w-[110%] -ml-1 pl-1">
                    {activeTeamName}
                  </div>
                  
                  {/* Opponent Subtitle */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black italic text-gray-400 uppercase tracking-widest bg-black px-1.5 py-0.5 rounded-sm border border-gray-800">VS MY TEAM</span>
                    <span className="text-[11px] font-bold italic uppercase text-gray-300 tracking-wide drop-shadow-md">
                      {sandboxDiff ? `SANDBOX [${sandboxDiff.replace('_', ' ')}]` : isCompleted ? 'CAMPAIGN COMPLETE' : `STAGE ${campaignStage}`}
                    </span>
                  </div>
                </>
              );
            })()}

            {/* NBA 2K Style Action Button */}
            {(() => {
              const activeDiff = sandboxDiff || currentStageInfo?.difficulty || 'EASY';
              const activeTeamInfo = mockAiTeams[activeDiff];
              const activeTeamName = sandboxDiff ? activeTeamInfo.name : (currentStageInfo?.name || 'SEASON COMPLETE');
              const isCompleted = !sandboxDiff && campaignStage > STAGES.length;
              const isButtonDisabled = hasInjuredStarters || (!sandboxDiff && (campaignStage > STAGES.length || !currentStageInfo));

              return (
                <button
                  disabled={isButtonDisabled}
                  onClick={() => onStartMatch(activeDiff, activeTeamName)}
                  className={`mt-5 relative w-[105%] -ml-2 h-[44px] flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 ${
                    isButtonDisabled
                      ? 'bg-gray-800 cursor-not-allowed border-b-2 border-gray-900 text-gray-500 opacity-60' 
                      : 'bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 cursor-pointer shadow-[0_5px_15px_rgba(249,115,22,0.4)] hover:shadow-[0_8px_25px_rgba(249,115,22,0.6)] hover:brightness-110 active:scale-[0.98] border-b-[3px] border-orange-900 text-white'
                  }`}
                  style={{ clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)' }}
                >
                  {/* Button shine sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                  
                  {isCompleted ? (
                    <span className="font-black italic uppercase tracking-[0.2em] text-[13px] z-10">COMPLETED</span>
                  ) : (
                    <>
                      <Play size={15} fill="currentColor" className="drop-shadow-md z-10" />
                      <span className="font-black italic uppercase tracking-[0.25em] text-[14px] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)] z-10">
                        GO TO MATCH
                      </span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
      
    </div>
  );
};
