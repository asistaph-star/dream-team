"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGameState, MatchResult } from "@/lib/context/GameStateContext";
import { mockMaterials } from "@/lib/data/mockItems";
import { getTierRating, getTierColor } from "@/lib/data/mockPlayers";
import { Player } from "@/lib/types/player";
import { mockAiTeams, Difficulty, MatchState, MatchEvent, PlayerMatchStats, createInitialMatchState, simulateTick, computeTeamScore, computeEffective, avgStamina, getStaminaMod, getPlayerMaxStamina, getStaminaPercent, OFFENSIVE_STRATEGIES, DEFENSIVE_STRATEGIES, emptyStats, generatePreMatchInjuries, calibrateLineupForInjuries } from "@/lib/utils/matchEngine";
import { Swords, Flame, Snowflake } from "lucide-react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { SeasonMap } from "@/components/season/SeasonMap";
import { ViewState } from "@/features/match/types";
import { MATCH_STAMINA_UI_CONFIG, SLOT_POSITIONS } from "@/features/match/constants/matchConfig";
import { calculateTS } from "@/features/match/utils/calculateTS";
import { getPlayerImage } from "@/features/match/utils/playerImages";
import { getRarityColor } from "@/features/match/utils/rarityColor";
import { getPositionClass } from "@/features/match/utils/positionUtils";
import { MythicEnergyAura } from "@/features/match/components/MythicEnergyAura";
import { DragGhost } from "@/features/match/components/DragGhost";
import { RunOverlay } from "@/features/match/components/RunOverlay";
import { PlayerEventBanner } from "@/features/match/components/PlayerEventBanner";
import { FreeThrowPopup } from "@/features/match/components/FreeThrowPopup";
import { ShotMeter } from "@/features/match/components/ShotMeter";
import { FoulPips } from "@/features/match/components/FoulPips";
import { PlayerTooltip } from "@/features/match/components/PlayerTooltip";
import { PlayerStatusIcons } from "@/features/match/components/PlayerStatusIcons";
import { PlayerAvailabilityOverlay } from "@/features/match/components/PlayerAvailabilityOverlay";
import { BlockCourtAnimation } from "@/features/match/components/BlockCourtAnimation";
import { ClutchFrame } from "@/features/match/components/ClutchFrame";
import { MatchPlayerUnit } from "@/features/match/components/MatchPlayerUnit";
import { SubstitutionModal } from "@/features/match/components/SubstitutionModal";





export default function MatchPage() {
  const router = useRouter();
  const { finishMatch, activeLineup, activeReserves, roster, teamOffense, teamDefense, strategyLevels } = useGameState();
  const matchRoster = useMemo(() => [...activeLineup, ...activeReserves], [activeLineup, activeReserves]);
  const injuredStarters = activeLineup.filter(p => p.isInjured);
  const hasInjuredStarters = injuredStarters.length > 0;

  const [viewState, setViewState] = useState<ViewState>('SEASON_MAP');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  
  const [matchState, setMatchState] = useState<MatchState>(createInitialMatchState());
  const [reward, setReward] = useState<MatchResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [wasPausedBeforeModal, setWasPausedBeforeModal] = useState(false);
  const [offCooldownEnd, setOffCooldownEnd] = useState(0);
  const [blockAnimationType, setBlockAnimationType] = useState<'court' | 'cut-in'>('court');
  const [defCooldownEnd, setDefCooldownEnd] = useState(0);
  const [subCooldownEnd, setSubCooldownEnd] = useState(0);
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  const [subCourtPick, setSubCourtPick] = useState<string | null>(null);
  const [subBenchPick, setSubBenchPick] = useState<string | null>(null);
  // Pointer-based drag and drop state
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [potentialDragPlayerId, setPotentialDragPlayerId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragHoverSlotId, setDragHoverSlotId] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerPosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Custom Court Layout State
  // Custom Court Layout State (Positions preserved from GTooL)
  const [courtPositions, setCourtPositions] = useState<Record<string, {x: number, y: number}>>({
    'SF': { x: 15, y: 10 },
    'PF': { x: 85, y: 10 },
    'C':  { x: 50, y: 35 },
    'SG': { x: 28, y: 60 },
    'PG': { x: 72, y: 60 }
  });

  useEffect(() => {
    const saved = localStorage.getItem('dream_team_court_layout');
    if (saved) {
      try {
        setCourtPositions(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const [liveLineup, setLiveLineup] = useState<Player[]>([]);
  const [halftimeCountdown, setHalftimeCountdown] = useState(20);
  const halftimeResumedRef = useRef(false);
  const [ftRevealCount, setFtRevealCount] = useState(0);
  const [activeFtIndex, setActiveFtIndex] = useState(0);
  const [activeFtStatus, setActiveFtStatus] = useState<'idle' | 'aiming' | 'shooting' | 'resolved'>('idle');
  const [showEnergyDrinkModal, setShowEnergyDrinkModal] = useState(false);
  const [energyDrinkPick, setEnergyDrinkPick] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<'pbp' | 'stats'>('pbp');
  const [statsTeam, setStatsTeam] = useState<'user' | 'ai'>('user');
  const [statsFilter, setStatsFilter] = useState<'starters' | 'bench'>('starters');
  const [matchScale, setMatchScale] = useState(1);
  const [showOTTransition, setShowOTTransition] = useState(false);
  const [showPostStats, setShowPostStats] = useState(false);
  const [shootoutRevealCount, setShootoutRevealCount] = useState(0);
  const matchFinishedRef = useRef(false);
  const [activeRunOverlay, setActiveRunOverlay] = useState<{ team: 'user' | 'ai'; count: number } | null>(null);
  const prevUserRunRef = useRef(0);
  const prevAiRunRef = useRef(0);

  // Shot meter sequence states
  const [shotMeterProgress, setShotMeterProgress] = useState(0);
  const [shotMeterStatus, setShotMeterStatus] = useState<'idle' | 'filling' | 'release' | 'done'>('idle');
  const [shotMeterFeedback, setShotMeterFeedback] = useState('');

  useEffect(() => {
    if (!draggingPlayerId && !potentialDragPlayerId) return;

    const handlePointerMove = (e: PointerEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      setPointerPos({ x: e.clientX, y: e.clientY });

      if (potentialDragPlayerId && !draggingPlayerId && dragStartPos) {
        const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
        if (dist > 10) {
          hasDraggedRef.current = true;
          setDraggingPlayerId(potentialDragPlayerId);
          setPotentialDragPlayerId(null);
        }
      }

      if (draggingPlayerId) {
        
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest('[data-drag-id]');
        if (slotEl) {
          const slot = slotEl.getAttribute('data-drag-id');
          if (dragHoverSlotId !== slot) setDragHoverSlotId(slot);
        } else {
          if (dragHoverSlotId !== null) setDragHoverSlotId(null);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (draggingPlayerId) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest('[data-drag-id]');
        const targetId = slotEl ? slotEl.getAttribute('data-drag-id') : null;
        
        if (targetId && targetId !== draggingPlayerId) {
           const lineup = liveLineup.length > 0 ? liveLineup : activeLineup;
           const draggedIsCourt = lineup.some(p => p.id === draggingPlayerId);
           const targetIsCourt = lineup.some(p => p.id === targetId);
           
           if (draggedIsCourt !== targetIsCourt) { 
              const courtPlayerId = draggedIsCourt ? draggingPlayerId : targetId;
              const benchPlayerId = draggedIsCourt ? targetId : draggingPlayerId;
              
              const stam = matchState.playerStamina[benchPlayerId] ?? 100;
              const isFouledOut = (matchState.fouledOut ?? []).includes(benchPlayerId);
              const statusObj = matchState.injuries[benchPlayerId];
              const isDNP = statusObj && (statusObj.status === 'OUT' || statusObj.status === 'DNP');
              const isCooldownActive = cooldownNow < subCooldownEnd;

              if (!isFouledOut && !isDNP && !isCooldownActive) {
                const courtPlayer = lineup.find(p => p.id === courtPlayerId);
                const benchPlayer = matchRoster.find(p => p.id === benchPlayerId);
                if (courtPlayer && benchPlayer) {
                  const newLineup = lineup.map(p => p.id === courtPlayerId ? benchPlayer : p);
                  setLiveLineup(newLineup);
                  addEvent(`${courtPlayer.name} heads to the bench, ${benchPlayer.name} checks in!`);
                  const outgoingStamina = matchState.playerStamina[courtPlayer.id] ?? 100;
                  setMatchState(prev => ({
                    ...prev,
                    subsMade: prev.subsMade + 1,
                    goodSubsMade: prev.goodSubsMade + ((outgoingStamina < 50) ? 1 : 0),
                  }));
                  setSubCooldownEnd(Date.now() + 5000);
                }
              }
           }
        }
      }
      
      setTimeout(() => { hasDraggedRef.current = false; }, 50);
      setDraggingPlayerId(null);
      setPotentialDragPlayerId(null);
      setDragHoverSlotId(null);
      setDragStartPos(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingPlayerId, dragHoverSlotId, potentialDragPlayerId, dragStartPos, liveLineup, activeLineup, matchRoster, matchState, subCooldownEnd, cooldownNow]);

  // Smooth clock animation states
  const [displayClock, setDisplayClock] = useState<number>(720);
  const [displayPossClock, setDisplayPossClock] = useState<number>(24);
  const prevMatchStateClockRef = useRef(720);
  const [halftimeTriggered, setHalftimeTriggered] = useState(false);

  useEffect(() => {
    // If the clock was reset (e.g. new game or new quarter or shootout)
    if (matchState.clock > prevMatchStateClockRef.current) {
      setDisplayClock(matchState.clock);
      setDisplayPossClock(matchState.possessionClock ?? 24);
      prevMatchStateClockRef.current = matchState.clock;
      return;
    }

    if (matchState.clock === prevMatchStateClockRef.current) {
      return;
    }

    // A play occurred! Animate clock countdown over 1200ms
    const timeElapsed = matchState.lastTimeElapsed ?? 15;
    const shotClockStart = matchState.lastPossessionClockStart ?? 24;
    const shotClockEnd = Math.max(0, shotClockStart - timeElapsed);

    const gameClockStart = matchState.clock + timeElapsed;
    const gameClockEnd = matchState.clock;

    const duration = 1200; // animate over 1.2 seconds of the 1.5s interval
    const steps = 24;      // update ~20 times per second
    const stepDuration = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;

      // Linear interpolation
      const currentGameClock = Math.max(gameClockEnd, Math.round(gameClockStart - progress * timeElapsed));
      const currentShotClock = Math.max(shotClockEnd, Math.round(shotClockStart - progress * (shotClockStart - shotClockEnd)));

      setDisplayClock(currentGameClock);
      setDisplayPossClock(currentShotClock);

      if (step >= steps) {
        clearInterval(interval);
        // Snap to target game clock and next possession starting shot clock!
        setDisplayClock(gameClockEnd);
        setDisplayPossClock(matchState.possessionClock ?? 24);
      }
    }, stepDuration);

    prevMatchStateClockRef.current = matchState.clock;
    return () => clearInterval(interval);
  }, [matchState.clock, matchState.possessionClock, matchState.lastTimeElapsed, matchState.lastPossessionClockStart]);

  // Trigger run banner only when active run extends/increases, then fade out
  useEffect(() => {
    const userRun = matchState.consecutiveUserRun;
    const aiRun = matchState.consecutiveAiRun;

    const userExtended = userRun > prevUserRunRef.current && userRun >= 6;
    const aiExtended = aiRun > prevAiRunRef.current && aiRun >= 6;

    if (userExtended) {
      setActiveRunOverlay({ team: 'user', count: userRun });
    } else if (aiExtended) {
      setActiveRunOverlay({ team: 'ai', count: aiRun });
    } else if (userRun === 0 && aiRun === 0) {
      setActiveRunOverlay(null);
    }

    prevUserRunRef.current = userRun;
    prevAiRunRef.current = aiRun;
  }, [matchState.consecutiveUserRun, matchState.consecutiveAiRun]);

  // Manage run banner closing timer independently so it closes after a short time
  useEffect(() => {
    if (!activeRunOverlay) return;
    const timer = setTimeout(() => {
      setActiveRunOverlay(null);
    }, 3000); // close after 3 seconds
    return () => clearTimeout(timer);
  }, [activeRunOverlay]);

  useEffect(() => {
    if (matchState.quarter >= 5) {
      setShowOTTransition(true);
      const timer = setTimeout(() => {
        setShowOTTransition(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [matchState.quarter]);

  // ═══ SHOT METER SEQUENCE CLEARING + SEQUENTIAL REVEAL ═══
  useEffect(() => {
    if (!matchState.activeShotMeter) {
      setShotMeterProgress(0);
      setShotMeterStatus('idle');
      setShotMeterFeedback('');
      return;
    }

    let active = true;
    const runSeq = async () => {
      const sm = matchState.activeShotMeter;
      if (!sm) return;

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      // Stage 1: Filling (650ms)
      setShotMeterStatus('filling');
      setShotMeterFeedback('');
      
      const steps = 25;
      const stepDuration = 650 / steps;
      const targetVal = sm.releaseProgress;
      
      for (let s = 1; s <= steps; s++) {
        if (!active) return;
        // Cubic ease-out feel
        const progressRatio = s / steps;
        const currentProgress = targetVal * progressRatio;
        setShotMeterProgress(currentProgress);
        await delay(stepDuration);
      }

      if (!active) return;

      // Stage 2: Release & Splash (1000ms)
      setShotMeterStatus('release');
      setShotMeterFeedback(sm.feedback);
      await delay(1000);

      if (!active) return;

      // Stage 3: Clean up and resolve
      setMatchState(prev => ({
        ...prev,
        activeShotMeter: null
      }));
      setShotMeterStatus('done');
    };

    runSeq();
    return () => { active = false; };
  }, [matchState.activeShotMeter]);

  // Dynamic full-screen scale — fills viewport while preserving 1420x800 aspect ratio
  useEffect(() => {
    const STADIUM_W = 1420;
    const STADIUM_H = 800;
    const compute = () => {
      const scaleW = window.innerWidth / STADIUM_W;
      const scaleH = window.innerHeight / STADIUM_H;
      setMatchScale(Math.min(scaleW, scaleH));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [matchState.events]);

  // Cooldown ticker
  useEffect(() => {
    const t = setInterval(() => setCooldownNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const currentLineup = liveLineup.length > 0 ? liveLineup : activeLineup;

  // Sync liveLineup with activeLineup on match start (only once)
  useEffect(() => {
    if (viewState === 'SIMULATING' && liveLineup.length === 0) {
      setLiveLineup([...activeLineup]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState]);


  const startMatch = useCallback((diff: Difficulty) => {
    setSelectedDifficulty(diff);
    const initState = createInitialMatchState();
    initState.difficulty = diff;
    initState.strategyLevels = strategyLevels;

    // Initialize playerStats, playerStamina, and formRating for all players:
    const initStamina: Record<string, number> = {};
    const initStats: Record<string, PlayerMatchStats> = {};
    const initFormRating: Record<string, number> = {};
    const initFormNarrativeFired: MatchState['formNarrativeFired'] = {};

    // 1. Initialize user roster:
    matchRoster.forEach(p => {
      initStamina[p.id] = getPlayerMaxStamina(p);
      initStats[p.id] = emptyStats();
      initFormRating[p.id] = 1.0;
      initFormNarrativeFired[p.id] = { hot108: false, hot112: false, cold092: false, cold088: false, recovered: true };
    });

    // 2. Initialize all 10 AI team players:
    const aiTeam = mockAiTeams[diff];
    [...aiTeam.roster].forEach(p => {
      initStamina[p.id] = getPlayerMaxStamina(p);
      initStats[p.id] = emptyStats();
      initFormRating[p.id] = 1.0;
      initFormNarrativeFired[p.id] = { hot108: false, hot112: false, cold092: false, cold088: false, recovered: true };
    });

    // Roll injuries
    const rolledInjuries = generatePreMatchInjuries(matchRoster, aiTeam.roster);
    initState.injuries = rolledInjuries;

    // Calibrate starting lineups based on rolled injuries
    const calibratedLineup = calibrateLineupForInjuries(activeLineup, matchRoster, rolledInjuries);
    const calibratedAiLineup = calibrateLineupForInjuries(aiTeam.roster.slice(0, 5), aiTeam.roster, rolledInjuries);

    // Initial coach decision notifications in logs
    const initialEvents: MatchEvent[] = [];
    activeLineup.forEach((starter, index) => {
      const replacement = calibratedLineup[index];
      if (replacement.id !== starter.id) {
        const status = rolledInjuries[starter.id];
        initialEvents.push({
          id: `init-sub-user-${starter.id}-${Date.now()}`,
          time: '[PRE-GAME]',
          text: `Coach Decision: ${starter.name} is OUT (${status.reason || 'DNP'}). ${replacement.name} starts at ${starter.position}!`,
          isUserTeam: true,
          pointsScored: 0
        });
      }
    });

    // Also calibrate AI starting lineup
    aiTeam.roster.slice(0, 5).forEach((starter, index) => {
      const replacement = calibratedAiLineup[index];
      if (replacement.id !== starter.id) {
        const status = rolledInjuries[starter.id];
        initialEvents.push({
          id: `init-sub-ai-${starter.id}-${Date.now()}`,
          time: '[PRE-GAME]',
          text: `Injury Report: ${starter.name} is OUT (${status.reason || 'DNP'}). ${replacement.name} starts at ${starter.position}!`,
          isUserTeam: false,
          pointsScored: 0
        });
      }
    });

    initState.events = initialEvents;
    initState.playerStamina = initStamina;
    initState.playerStats = initStats;
    initState.formRating = initFormRating;
    initState.formNarrativeFired = initFormNarrativeFired;
    initState.userPlayerIds = matchRoster.map(p => p.id);
    initState.aiPlayerIds = aiTeam.roster.map(p => p.id);
    initState.aiLineupIds = calibratedAiLineup.map(p => p.id);

    setMatchState(initState);
    setLiveLineup(calibratedLineup);
    setIsPaused(false);
    setReward(null);
    setHalftimeTriggered(false);
    setViewState('PRE_MATCH');
  }, [roster, activeLineup]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (viewState === 'SIMULATING' && !matchState.isFinished && !isPaused && !matchState.ftSequence && !showOTTransition && !matchState.shootoutSequence && !matchState.activeShotMeter) {
      interval = setInterval(() => {
        setMatchState(prev => {
          const ai = mockAiTeams[selectedDifficulty];
          const next = simulateTick(prev, teamOffense, teamDefense, ai, currentLineup, matchRoster);
          
          // Halftime trigger — pause for 20s
          if (next.halftimeShown && !halftimeTriggered) {
            setHalftimeTriggered(true);
            setViewState('HALFTIME');
            setHalftimeCountdown(20);
            return next;
          }
          
          return next;
        });
      }, 1500); 
    }
    return () => clearInterval(interval);
  }, [viewState, matchState.isFinished, selectedDifficulty, teamOffense, teamDefense, currentLineup, matchRoster, isPaused, matchState.ftSequence, matchState.activeShotMeter]);

  // ═══ MATCH FINISH — runs AFTER state settles to avoid cross-component update error ═══
  useEffect(() => {
    if (matchState.isFinished && !matchState.shootoutSequence && !matchFinishedRef.current) {
      matchFinishedRef.current = true;
      const isWin = matchState.userScore > matchState.aiScore;
      const result = finishMatch(selectedDifficulty, matchState.userOffStrategy, matchState.userDefStrategy, isWin);
      setReward(result);
      setViewState('POST_GAME');
    }
  }, [matchState.isFinished, matchState.shootoutSequence, selectedDifficulty, finishMatch]);


  // ═══ FT SEQUENCE CLEARING + SEQUENTIAL REVEAL ═══
  useEffect(() => {
    if (!matchState.ftSequence) {
      setActiveFtIndex(0);
      setActiveFtStatus('idle');
      setFtRevealCount(0);
      return;
    }

    let active = true;
    const runSeq = async () => {
      const ft = matchState.ftSequence;
      if (!ft) return;
      const totalShots = ft.results.length;
      setFtRevealCount(0);

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      for (let i = 0; i < totalShots; i++) {
        if (!active) return;
        setActiveFtIndex(i);
        
        // Stage 1: Aiming (450ms) - Pulsing focus ring
        setActiveFtStatus('aiming');
        await delay(450);
        if (!active) return;

        // Stage 2: Shooting (450ms) - Ball in flight bounce & ping
        setActiveFtStatus('shooting');
        await delay(450);
        if (!active) return;

        // Stage 3: Resolved (600ms) - Confirmed make/miss explosive reveal
        setActiveFtStatus('resolved');
        setFtRevealCount(i + 1);
        await delay(600);
      }

      if (!active) return;
      await delay(200);
      if (!active) return;
      setMatchState(s => ({ ...s, ftSequence: null }));
    };

    runSeq();
    return () => { active = false; };
  }, [matchState.ftSequence]);

  // ═══ SHOOTOUT SEQUENCE REVEAL ═══
  useEffect(() => {
    if (!matchState.shootoutSequence) { setShootoutRevealCount(0); return; }
    setShootoutRevealCount(0);
    const totalRounds = matchState.shootoutSequence.results.length;
    const perRoundMs = 3000;
    const revealTimers: NodeJS.Timeout[] = [];
    for (let i = 0; i < totalRounds; i++) {
      revealTimers.push(setTimeout(() => setShootoutRevealCount(i + 1), (i + 1) * perRoundMs));
    }
    const clearTimer = setTimeout(() => {
      setMatchState(s => ({ ...s, shootoutSequence: null }));
      const isWin = matchState.userScore > matchState.aiScore;
      const result = finishMatch(selectedDifficulty, matchState.userOffStrategy, matchState.userDefStrategy, isWin);
      setReward(result);
      setViewState('POST_GAME');
    }, totalRounds * perRoundMs + 3000);
    return () => { revealTimers.forEach(t => clearTimeout(t)); clearTimeout(clearTimer); };
  }, [matchState.shootoutSequence, finishMatch, selectedDifficulty]);

  // ═══ PENDING AUTO-SUB (foul-out) ═══
  useEffect(() => {
    if (!matchState.pendingAutoSub) return;
    const { outId, inId } = matchState.pendingAutoSub;
    const benchPlayer = matchRoster.find(p => p.id === inId);
    if (benchPlayer) {
      setLiveLineup(prev => prev.map(p => p.id === outId ? benchPlayer : p));
    }
    setMatchState(s => ({ ...s, pendingAutoSub: null }));
  }, [matchState.pendingAutoSub, matchRoster]);

  // Halftime auto-resume countdown
  useEffect(() => {
    if (viewState !== 'HALFTIME') {
      halftimeResumedRef.current = false;
      return;
    }

    if (halftimeCountdown <= 0 && !halftimeResumedRef.current) {
      halftimeResumedRef.current = true;
      handleHalftimeResume();
      return;
    }

    if (halftimeCountdown > 0) {
      const t = setTimeout(() => {
        setHalftimeCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [viewState, halftimeCountdown]);

  const handleHalftimeResume = () => {
    // Quarter-break stamina recovery is handled by the match engine. Keep this
    // resume handler as UI/narrative only so halftime cannot double-recover.
    const eff = computeEffective(currentLineup, matchState.playerStamina, matchState.userOffStrategy, matchState.userDefStrategy);
    // Resume narrative
    const diff = matchState.userScore - matchState.aiScore;
    const narrative = diff > 0 ? `We're back for the second half - My Team leads by ${diff}` : diff < 0 ? `We're back for the second half - My Team trails by ${Math.abs(diff)}` : "All square at halftime - everything to play for in the second half";
    const resumeEvent = { id: Date.now().toString() + '_' + Math.random().toString(36).slice(2), time: '[Q3 12:00]', text: narrative, isUserTeam: true, pointsScored: 0 };
    setMatchState(prev => ({
      ...prev,
      effectiveUserOff: eff.off, effectiveUserDef: eff.def,
      events: [resumeEvent, ...prev.events].slice(0, 50),
    }));
    setViewState('SIMULATING');
  };

  const handleReturn = () => {
    setReward(null);
    setLiveLineup([]);
    setIsPaused(false);
    setViewState('SEASON_MAP');
  };

  const openModal = (type: 'strategy' | 'sub' | 'energydrink') => {
    if (type === 'strategy') setShowStrategyModal(true);
    else if (type === 'sub') { setShowSubModal(true); setSubCourtPick(null); setSubBenchPick(null); }
    else { setShowEnergyDrinkModal(true); setEnergyDrinkPick(null); }
  };

  const closeModal = () => {
    setShowStrategyModal(false);
    setShowSubModal(false);
    setShowEnergyDrinkModal(false);
  };

  const addEvent = (text: string, isUser: boolean = true) => {
    const ev: MatchEvent = {
      id: Date.now().toString() + Math.random().toString(),
      time: `[Q${matchState.quarter}]`,
      text, isUserTeam: isUser, pointsScored: 0
    };
    setMatchState(prev => ({ ...prev, events: [ev, ...prev.events].slice(0, 30) }));
  };

  const handleEnergyDrinkConfirm = () => {
    if (!energyDrinkPick || matchState.energyDrinksLeft <= 0) return;
    const player = currentLineup.find(p => p.id === energyDrinkPick);
    if (!player) return;
    const currentStam = matchState.playerStamina[player.id] ?? 100;
    const isGoodUse = currentStam < 40;
    const newStam = Math.min(getPlayerMaxStamina(player), currentStam + MATCH_STAMINA_UI_CONFIG.energyDrinkRecovery);
    const gts = (matchState.quarter - 1) * 720 + (720 - matchState.clock);
    const isHighClutch = matchState.quarter === 4 && matchState.clock <= 60 && Math.abs(matchState.userScore - matchState.aiScore) <= 5;
    const isISO = matchState.userOffStrategy === 'Isolation (ISO)';
    const isoStar = isISO ? [...currentLineup].sort((a, b) => b.ovr - a.ovr)[0] : null;
    setMatchState(prev => ({
      ...prev,
      playerStamina: { ...prev.playerStamina, [player.id]: newStam },
      energyDrinksLeft: prev.energyDrinksLeft - 1,
      energyDrinkLocked: { ...prev.energyDrinkLocked, [player.id]: gts + MATCH_STAMINA_UI_CONFIG.energyDrinkLockSeconds },
      energyDrinkGoodUses: prev.energyDrinkGoodUses + (isGoodUse ? 1 : 0),
      energyDrinkPendingForm: player.id,
    }));
    const baseMsg = isHighClutch
      ? `CLUTCH BOOST: ${player.name} locked in for the final stretch!`
      : isoStar?.id === player.id
      ? `${player.name} gets the boost - ISO stays alive a little longer!`
      : `${player.name} gets the energy boost - stamina restored to ${Math.floor(newStam)}`;
    addEvent(baseMsg);
    if (isGoodUse) addEvent(`Smart call — ${player.name} was running on empty`);
    setEnergyDrinkPick(null);
    closeModal();
  };

  const [timeoutCountdown, setTimeoutCountdown] = useState(0);
  const [momentumTimer, setMomentumTimer] = useState(0);

  // Momentum countdown ticker
  useEffect(() => {
    if (!matchState.momentumActive) { setMomentumTimer(0); return; }
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((matchState.momentumEndTime - Date.now()) / 1000));
      setMomentumTimer(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [matchState.momentumActive, matchState.momentumEndTime]);

  const handleTimeout = () => {
    if (matchState.timeoutsLeft <= 0 || timeoutCountdown > 0) return;
    const newStamina = { ...matchState.playerStamina };
    currentLineup.forEach(p => {
      newStamina[p.id] = Math.min(getPlayerMaxStamina(p), (newStamina[p.id] ?? getPlayerMaxStamina(p)) + MATCH_STAMINA_UI_CONFIG.timeoutRecovery);
    });
    setMatchState(prev => ({
      ...prev, playerStamina: newStamina, timeoutsLeft: prev.timeoutsLeft - 1, lastPlayCategory: 'made_shot'
    }));
    addEvent(`Timeout called! Players catch their breath. (+${MATCH_STAMINA_UI_CONFIG.timeoutRecovery} stamina)`);
    setIsPaused(true);
    setTimeoutCountdown(5);
    const t = setInterval(() => {
      setTimeoutCountdown(prev => {
        if (prev <= 1) { clearInterval(t); setIsPaused(false); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleMomentum = () => {
    if (matchState.momentumUsesLeft <= 0 || matchState.momentumActive) return;
    setMatchState(prev => ({
      ...prev,
      momentumUsesLeft: prev.momentumUsesLeft - 1,
      momentumActive: true,
      momentumEndTime: Date.now() + 20000
    }));
    addEvent("MOMENTUM SURGE - My Team is locked in!");
  };

  const handleOffStrategyChange = (name: string) => {
    if (name === matchState.userOffStrategy) return;
    if (cooldownNow < offCooldownEnd) { addEvent("Too soon to change strategy! Let the players adjust first."); return; }
    if (name === "Isolation (ISO)") {
      const star = [...currentLineup].sort((a, b) => b.ovr - a.ovr)[0];
      if (getStaminaPercent(star, matchState.playerStamina[star.id]) < 40) {
        addEvent(`${star.name} is too tired to ISO! Switch to a different offense.`); return;
      }
    }
    setMatchState(prev => ({ ...prev, userOffStrategy: name }));
    setOffCooldownEnd(Date.now() + 15000);
    addEvent(`My Team switches to ${name} on offense!`);
  };

  const handleDefStrategyChange = (name: string) => {
    if (name === matchState.userDefStrategy) return;
    if (cooldownNow < defCooldownEnd) { addEvent("Too soon to change strategy! Let the players adjust first."); return; }
    setMatchState(prev => ({ ...prev, userDefStrategy: name }));
    setDefCooldownEnd(Date.now() + 15000);
    addEvent(`My Team tightens up with ${name} on defense!`);
  };

  const handleSubConfirm = () => {
    if (!subCourtPick || !subBenchPick) return;
    const lineup = liveLineup.length > 0 ? liveLineup : [...activeLineup];
    const courtPlayer = lineup.find(p => p.id === subCourtPick);
    const benchPlayer = matchRoster.find(p => p.id === subBenchPick);
    if (!courtPlayer || !benchPlayer) return;
    // Verify bench player is not already on court
    if (lineup.find(p => p.id === subBenchPick)) return;
    const newLineup = lineup.map(p => p.id === subCourtPick ? benchPlayer : p);
    setLiveLineup(newLineup);
    addEvent(`${courtPlayer.name} heads to the bench, ${benchPlayer.name} checks in!`);
    // Decision tracking (Step 9): count sub, flag as "good" if pulling a tired player
    const outgoingStamina = matchState.playerStamina[courtPlayer.id] ?? 100;
    const isGoodSub = outgoingStamina < 50;
    setMatchState(prev => ({
      ...prev,
      subsMade: prev.subsMade + 1,
      goodSubsMade: prev.goodSubsMade + (isGoodSub ? 1 : 0),
    }));
    // Set substitution cooldown: 5-second cooldown to balance substitutions
    setSubCooldownEnd(Date.now() + 5000);
    setSubCourtPick(null); setSubBenchPick(null);
    if (showSubModal) closeModal();
  };

  const aiTeam = mockAiTeams[selectedDifficulty];
  const userTotal = teamOffense + teamDefense;
  const aiTotal = aiTeam.off + aiTeam.def;
  const maxOvr = Math.max(userTotal, aiTotal, 1);
  const userBarPct = (userTotal / maxOvr) * 100;
  const aiBarPct = (aiTotal / maxOvr) * 100;



  // ═══ DERIVED DISPLAY STATE (Hides FT results until revealed) ═══
  let displayUserScore = matchState.userScore;
  let displayAiScore = matchState.aiScore;
  let displayEvents = matchState.events;

  if (matchState.activeShotMeter && shotMeterStatus !== 'done') {
    displayEvents = displayEvents.slice(1);
    if (matchState.activeShotMeter.isSuccess) {
      if (matchState.activeShotMeter.isAiTeam) {
        displayAiScore -= 3;
      } else {
        displayUserScore -= 3;
      }
    }
  }

  // Layer 9: Clutch UI state
  const uiScoreDiff = Math.abs(matchState.userScore - matchState.aiScore);
  const isClutchActive = matchState.quarter === 4 && matchState.clock <= 120 && uiScoreDiff <= 8;
  const isClutchHigh = matchState.quarter === 4 && matchState.clock <= 60 && uiScoreDiff <= 5;

  // Layer 8 (Step 8): Home court UI state
  const isHomeGame = matchState.isHomeGame;
  // Crowd energy: tug-of-war based on relative momentum
  const totalMom = (matchState.userMomentum + matchState.aiMomentum) || 1;
  const userMomPct = (matchState.userMomentum / totalMom) * 100;
  // Rally mode: home team crowd rallies when home team is down ≤10
  const uiRallyMode = isHomeGame
    ? matchState.userScore < matchState.aiScore && uiScoreDiff <= 10
    : matchState.aiScore < matchState.userScore && uiScoreDiff <= 10;

  if (matchState.ftSequence) {
    displayEvents = displayEvents.filter(e => !e.isHiddenDuringFT);
    const ft = matchState.ftSequence;
    const totalMakes = ft.results.filter(r => r === 'make').length;
    const revealedMakes = ft.results.slice(0, ftRevealCount).filter(r => r === 'make').length;
    const hiddenMakes = totalMakes - revealedMakes;
    
    if (ft.isUserTeam) displayUserScore -= hiddenMakes;
    else displayAiScore -= hiddenMakes;

    // Hide the final set-piece summary events until the sequence completely resolves
    if (ftRevealCount < ft.totalShots) {
      displayEvents = displayEvents.filter(e => !e.text.includes('from the line') && !e.text.includes('from the stripe'));
    }

    // Dynamically build and append real-time logs for resolved free throws!
    const ftEvents: MatchEvent[] = [];
    for (let i = 0; i < ftRevealCount; i++) {
      const outcome = ft.results[i];
      const timeStr = matchState.events[0]?.time || '12:00';
      ftEvents.push({
        id: `ft-log-${i}`,
        time: timeStr,
        isUserTeam: ft.isUserTeam,
        text: `${ft.shooterName} ${outcome === 'make' ? 'MAKES' : 'MISSES'} free throw ${i + 1} of ${ft.totalShots}`,
        pointsScored: outcome === 'make' ? 1 : 0,
      });
    }
    displayEvents = [...ftEvents, ...displayEvents];
  }

  const getDisplayStats = (pId: string) => {
    const s = { ...(matchState.playerStats[pId] || { PTS: 0, REB: 0, AST: 0, STL: 0, TOV: 0, BLK: 0, OREB: 0, DREB: 0, FOL: 0, FTA: 0, FTM: 0 }) };
    if (matchState.ftSequence && matchState.ftSequence.shooterId === pId) {
      const ft = matchState.ftSequence;
      const totalMakes = ft.results.filter(r => r === 'make').length;
      const revealedMakes = ft.results.slice(0, ftRevealCount).filter(r => r === 'make').length;
      const hiddenMakes = totalMakes - revealedMakes;
      const hiddenAttempts = ft.totalShots - ftRevealCount;
      s.PTS -= hiddenMakes;
      s.FTM -= hiddenMakes;
      s.FTA -= hiddenAttempts;
    }
    return s;
  };



  const handleSwapCourtPlayers = (player1Id: string, player2Id: string) => {
    const idx1 = currentLineup.findIndex(p => p.id === player1Id);
    const idx2 = currentLineup.findIndex(p => p.id === player2Id);
    if (idx1 === -1 || idx2 === -1) return;

    const lineup = liveLineup.length > 0 ? [...liveLineup] : [...activeLineup];
    const temp = lineup[idx1];
    lineup[idx1] = lineup[idx2];
    lineup[idx2] = temp;

    setLiveLineup(lineup);
    addEvent(`Tactical Swap: ${lineup[idx1].name} swapped slots with ${lineup[idx2].name}`);
  };

  const renderPlayerCard = (p: Player, isAi: boolean, slotPos?: string, isGhost = false) => {
    const isActive = matchState.events[0]?.activePlayerId === p.id;
    const justScored = !matchState.ftSequence && matchState.lastScorerId === p.id && matchState.lastPointsScored !== undefined;
    const justMissed = !matchState.ftSequence && matchState.events[0]?.text?.toLowerCase()?.includes('misses') && matchState.events[0]?.activePlayerId === p.id;
    const displayPos = slotPos || p.position;
    const posClass = isGhost ? '' : getPositionClass(displayPos, isAi);
    const isOutOfPosition = slotPos ? p.position !== slotPos : false;
    const rarityColor = getRarityColor(p.rarity);
    
    const stam = Math.floor(matchState.playerStamina[p.id] ?? 100);
    const tier = getTierRating(p.ovr);
    const tierColor = getTierColor(tier);
    const bgImage = getPlayerImage(p);
    const pStats = getDisplayStats(p.id);

    const ftActive = matchState.ftSequence && matchState.ftSequence.shooterId === p.id;
    const showFtPopup = ftActive && activeFtStatus === 'resolved';
    const hasPopup = showFtPopup || justScored || justMissed || (!justScored && !justMissed && matchState.lastEventIndicator?.playerId === p.id);

    const hasFT = ftActive;
    const hasShotMeter = matchState.activeShotMeter && matchState.activeShotMeter.playerId === p.id;

    const isCourtDragged = draggingPlayerId === p.id;
    const isCourtDragOver = dragHoverSlotId === p.id && draggingPlayerId && draggingPlayerId !== p.id;
    const dragClass = isCourtDragged
      ? 'opacity-40 scale-95 border-dashed border-cyan-400'
      : isCourtDragOver
      ? 'shadow-[0_0_25px_#06b6d4] scale-105 border-cyan-400 ring-4 ring-cyan-400/50 z-50'
      : '';

    return (
      <MatchPlayerUnit
        player={p}
        dataSlotId={!isAi ? p.id : undefined}
        className={`player-unit ${posClass} ${dragClass} ${!isAi && !draggingPlayerId ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ transform: (isActive || hasShotMeter) ? 'scale(1.15)' : 'scale(1)', transformOrigin: 'bottom center', ...(hasShotMeter ? { zIndex: 150 } : hasFT ? { zIndex: 60 } : hasPopup ? { zIndex: 30 } : {}) }}
        onPointerDown={(e) => {
          if (!isAi && !showSubModal) {
            e.preventDefault();
            setPotentialDragPlayerId(p.id);
            setDragStartPos({ x: e.clientX, y: e.clientY });
            setPointerPos({ x: e.clientX, y: e.clientY });
          }
        }}
        isHot={Boolean(matchState.hotPlayers[p.id])}
        isCold={!matchState.hotPlayers[p.id] && (matchState.formRating[p.id] ?? 1.0) <= 0.90}
        showFtPopup={!!showFtPopup}
        ftOutcome={matchState.ftSequence ? matchState.ftSequence.results[activeFtIndex] : undefined}
        justScored={justScored}
        lastPointsScored={matchState.lastPointsScored}
        eventText={matchState.events[0]?.text || ''}
        justMissed={justMissed}
        lastEventIndicator={matchState.lastEventIndicator ?? null}
        showBlockAnimation={blockAnimationType === 'court' && !justScored && matchState.lastEventIndicator?.type === 'BLK' && matchState.lastEventIndicator?.targetId === p.id}
        ftSequence={matchState.ftSequence}
        activeFtIndex={activeFtIndex}
        activeFtStatus={activeFtStatus}
        showClutchFrame={isClutchActive && p.rarity === 'Mythic'}
        bgImage={bgImage}
        stam={stam}
        isFouledOut={(matchState.fouledOut ?? []).includes(p.id)}
        staminaMax={getPlayerMaxStamina(p)}
        displayPos={displayPos}
        isOutOfPosition={isOutOfPosition}
        fouls={getDisplayStats(p.id).FOL ?? 0}
        tier={tier}
        tierColor={tierColor}
        pStats={pStats}
        formRating={matchState.formRating[p.id]}
        activeShotMeter={matchState.activeShotMeter}
        shotMeterProgress={shotMeterProgress}
        shotMeterStatus={shotMeterStatus}
        shotMeterFeedback={shotMeterFeedback}
      />
    );
  };

  const matchStyles = `
        .stadium {
            width: 1420px; height: 800px; min-width: 1420px; flex-shrink: 0;
            background-image: url('https://www.dreamteamph.com/bg/match_stadium-v2.webp');
            background-size: 100% 100%; position: relative;
            transform: scale(${matchScale}); transform-origin: center;
        }
        .player-unit { position: absolute; width: 106px; height: 110px; z-index: 10; transition: transform 0.3s; background: transparent; }
        .player-unit:hover { z-index: 100; }
        .headshot { width: 106px; height: 100px; background-size: cover; background-repeat: no-repeat; background-position: center; position: absolute; bottom: 26px; left: 0; z-index: 30; }
        .card-bottom-wrapper { width: 106px; height: 34px; position: absolute; bottom: 0; left: 0; box-sizing: border-box; background: rgba(15, 15, 20, 0.85); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border-top: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0 0 8px 8px; display: flex; flex-direction: column; overflow: hidden; z-index: 40; }
        .stamina-container { width: 100%; height: 4px; background: linear-gradient(to right, #ef4444, #f97316, #10b981); position: relative; overflow: hidden; }
        .stamina-mask { height: 100%; width: 0; background: #1f2937; position: absolute; top: 0; right: 0; transition: width 1s; }
        .card-info { width: 100%; height: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3px 8px; cursor: default; text-align: center; }

        /* Hover Tooltip */
        .player-tooltip {
            display: none; position: absolute; bottom: 105%; left: 50%; transform: translateX(-50%);
            width: 240px; background: rgba(10,10,15,0.96); border: 2px solid #d87625;
            border-radius: 8px; padding: 0; z-index: 200; pointer-events: none;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        }
        .player-unit:hover .player-tooltip { display: block; }
        .tt-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: linear-gradient(to right, #d87625, #b45309); border-radius: 6px 6px 0 0; }
        .tt-name { color: white; font-weight: 900; font-size: 13px; }
        .tt-pos { color: white; font-weight: bold; font-size: 12px; background: rgba(0,0,0,0.3); padding: 1px 8px; border-radius: 4px; }
        .tt-body { padding: 8px 10px; }
        .tt-row { display: flex; justify-content: space-between; font-size: 11px; color: #d1d5db; padding: 2px 0; border-bottom: 1px solid #1f2937; }
        .tt-row:last-child { border-bottom: none; }
        .tt-row b { color: white; }
        .tt-stats { display: flex; justify-content: space-around; padding: 5px 10px; background: #0d1117; border-top: 1px solid #d87625; font-size: 10px; color: #9ca3af; }
        .tt-stats b { color: #eab308; font-size: 12px; }
        .tt-hot { text-align: center; font-size: 10px; color: #f59e0b; padding: 4px; background: rgba(245,158,11,0.1); font-weight: bold; }
        .tt-rarity { text-align: center; font-size: 10px; font-weight: 900; padding: 4px 0 6px; }

        .h-sf { top: 450px; left: 200px; }
        .h-c  { top: 290px; left: 160px; }
        .h-pf { top: 200px; left: 340px; }
        .h-sg { top: 430px; left: 420px; }
        .h-pg { top: 280px; left: 500px; }

        .a-sf { top: 450px; right: 180px; }
        .a-c  { top: 290px; right: 140px; }
        .a-pf { top: 200px; right: 320px; }
        .a-sg { top: 430px; right: 400px; }
        .a-pg { top: 280px; right: 480px; }

        @keyframes float-up {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-40px); opacity: 0; }
        }
        @keyframes fadeIn {
            0% { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes earthquake {
            0%,100% { transform: translate(0,0) rotate(0deg); }
            10%      { transform: translate(-5px,-3px) rotate(-0.6deg); }
            20%      { transform: translate(5px,3px) rotate(0.6deg); }
            30%      { transform: translate(-4px,4px) rotate(-0.4deg); }
            40%      { transform: translate(4px,-4px) rotate(0.4deg); }
            50%      { transform: translate(-6px,2px) rotate(-0.7deg); }
            60%      { transform: translate(6px,-2px) rotate(0.7deg); }
            70%      { transform: translate(-3px,5px) rotate(-0.3deg); }
            80%      { transform: translate(3px,-5px) rotate(0.3deg); }
            90%      { transform: translate(-5px,2px) rotate(-0.5deg); }
        }
        @keyframes earthquake-heavy {
            0%,100% { transform: translate(0,0) rotate(0deg); }
            8%       { transform: translate(-9px,-5px) rotate(-1.2deg); }
            16%      { transform: translate(9px,5px) rotate(1.2deg); }
            24%      { transform: translate(-7px,7px) rotate(-0.8deg); }
            32%      { transform: translate(7px,-7px) rotate(0.8deg); }
            40%      { transform: translate(-10px,3px) rotate(-1.5deg); }
            48%      { transform: translate(10px,-3px) rotate(1.5deg); }
            56%      { transform: translate(-6px,9px) rotate(-0.6deg); }
            64%      { transform: translate(6px,-9px) rotate(0.6deg); }
            72%      { transform: translate(-8px,4px) rotate(-1deg); }
            80%      { transform: translate(8px,-4px) rotate(1deg); }
            88%      { transform: translate(-9px,6px) rotate(-0.9deg); }
        }
        @keyframes lightning-bolt {
            0%,90%,100% { opacity:0; transform:scaleY(0.8); }
            10%,30%     { opacity:1; transform:scaleY(1); }
            20%         { opacity:0.3; }
            50%,70%     { opacity:1; transform:scaleY(1); }
            60%         { opacity:0.2; }
        }
        @keyframes run-glow-user {
            0%,100% { box-shadow: 0 0 30px rgba(6,182,212,0.7), 0 0 60px rgba(6,182,212,0.3); }
            50%     { box-shadow: 0 0 60px rgba(6,182,212,1), 0 0 120px rgba(6,182,212,0.6), inset 0 0 40px rgba(6,182,212,0.2); }
        }
        @keyframes run-glow-ai {
            0%,100% { box-shadow: 0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(239,68,68,0.3); }
            50%     { box-shadow: 0 0 60px rgba(239,68,68,1), 0 0 120px rgba(239,68,68,0.6), inset 0 0 40px rgba(239,68,68,0.2); }
        }
        @keyframes run-text-pop {
            0%   { transform: scale(0.4) rotate(-8deg); opacity:0; }
            40%  { transform: scale(1.15) rotate(2deg); opacity:1; }
            60%  { transform: scale(0.95) rotate(-1deg); }
            80%  { transform: scale(1.05) rotate(0.5deg); }
            100% { transform: scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes lightning-flash-bg {
            0%,100%  { opacity:0; }
            5%,15%   { opacity:0.18; }
            10%      { opacity:0.05; }
            50%,60%  { opacity:0.18; }
            55%      { opacity:0.05; }
        }
        @keyframes banner-pop {
            0%   { transform: translateY(8px) scale(0.92); opacity: 0; }
            18%  { transform: translateY(0) scale(1.0); opacity: 1; }
            82%  { transform: translateY(0) scale(1.0); opacity: 1; }
            100% { transform: translateY(-6px) scale(0.95); opacity: 0; }
        }
        @keyframes particle-blow {
            0% { transform: translate(-50%, -50%) rotate(var(--rot)) translateY(0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) rotate(var(--rot)) translateY(-65px) scale(0.2); opacity: 0; }
        }
        @keyframes splash-bounce {
            0% { transform: skewX(-12deg) scale(0.5); opacity: 0; }
            50% { transform: skewX(-12deg) scale(1.25); opacity: 1; }
            100% { transform: skewX(-12deg) scale(1.1); opacity: 1; }
        }
  `;

  if (viewState === 'PRE_MATCH') {
    const preIsHome = matchState.isHomeGame;
    const preAiTeam = mockAiTeams[selectedDifficulty];
    // PRE_MATCH should show the starting lineup, not the full roster
    const userPlayers = liveLineup.length > 0 ? liveLineup : activeLineup;
    const aiPlayers = matchState.aiLineupIds.map(id => preAiTeam.roster.find(p => p.id === id)).filter(Boolean) as Player[];
    return (
      <div className="fixed inset-0 z-[200] bg-[#070b13] flex flex-col items-center justify-between p-8 font-mono animate-[fadeIn_0.3s_ease-out] overflow-y-auto">
        {/* Neon scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3))] bg-[length:100%_4px]" />
        
        {/* Header */}
        <div className="w-full max-w-4xl text-center mt-4">
          <div className="text-[10px] text-cyan-400 font-bold tracking-[0.4em] uppercase mb-1">STADIUM MATCHUP PREVIEW</div>
          <h2 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
            NBA LIVE MATCH CENTER
          </h2>
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mt-3" />
        </div>

        {/* Roster Reports */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 my-6">
          {/* My Team */}
          <div className="bg-black/60 border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.05)]">
            <h3 className="text-sm font-black text-cyan-400 tracking-wider mb-4 border-b border-cyan-500/10 pb-2 flex justify-between">
              <span>MY TEAM</span>
              <span className="text-xs text-gray-500 font-normal">HOME COURT: {preIsHome ? 'YES' : 'NO'}</span>
            </h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 no-scrollbar">
              {userPlayers.map(p => {
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded border border-gray-800 bg-[#0c121e] transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-bold px-1.5 py-0.5 rounded">{p.position}</span>
                      <span className="text-white font-bold text-xs">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400">OVR: <b className="text-white">{p.ovr}</b></span>
                      <div className="text-[9px] border px-2 py-0.5 rounded font-black tracking-wider uppercase text-green-400 border-green-500/20 bg-green-500/5">
                        ● READY
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Team */}
          <div className="bg-black/60 border border-red-500/20 rounded-xl p-5 shadow-[0_0_25px_rgba(239,68,68,0.05)]">
            <h3 className="text-sm font-black text-red-400 tracking-wider mb-4 border-b border-red-500/10 pb-2 flex justify-between">
              <span>{preAiTeam.name.toUpperCase()}</span>
              <span className="text-xs text-gray-500 font-normal">STADIUM: {preIsHome ? 'AWAY' : 'HOME'}</span>
            </h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 no-scrollbar">
              {aiPlayers.map(p => {
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded border border-gray-800 bg-[#0c121e] transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-950 border border-red-500/30 text-red-400 font-bold px-1.5 py-0.5 rounded">{p.position}</span>
                      <span className="text-white font-bold text-xs">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400">OVR: <b className="text-white">{p.ovr}</b></span>
                      <div className="text-[9px] border px-2 py-0.5 rounded font-black tracking-wider uppercase text-green-400 border-green-500/20 bg-green-500/5">
                        ● READY
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tip-Off CTA Button */}
        <div className="w-full max-w-4xl text-center mb-4">
          <button
            onClick={() => setViewState('SIMULATING')}
            className="w-full max-w-md py-4 rounded-xl font-black text-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] hover:scale-105 transition-all uppercase tracking-widest cursor-pointer border border-cyan-300/40"
          >
            TIP-OFF MATCH
          </button>
          <div className="text-[10px] text-gray-500 mt-2">Home court advantage: {preIsHome ? 'My Team (+5% crowd energy)' : 'Opponent'}</div>
        </div>
      </div>
    );
  }

  if (viewState === 'SIMULATING' || viewState === 'HALFTIME') {
    return (
      <div className="flex w-full h-full justify-center items-center font-sans bg-black overflow-hidden fixed inset-0 z-[100]">
        {/* Blurred stadium background to replace black letterbox bars */}
        <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-md pointer-events-none" style={{ backgroundImage: 'url("https://www.dreamteamph.com/bg/match_stadium-v2.webp")' }} />
        
        <style dangerouslySetInnerHTML={{__html: matchStyles}} />
        
        {draggingPlayerId && (
          <style dangerouslySetInnerHTML={{ __html: `* { cursor: none !important; }` }} />
        )}
        
        {/* Global Ghost Drag Image */}
        {draggingPlayerId && (
          <DragGhost
            draggingPlayerId={draggingPlayerId}
            matchRoster={matchRoster}
            roster={roster}
            pointerPos={pointerPos}
            matchScale={matchScale}
            showSubModal={showSubModal}
            playerStamina={matchState.playerStamina}
          />
        )}

        <div className="stadium">
            {/* DEV TOGGLE FOR BLOCK ANIMATION */}
            <div className="absolute top-2 left-2 z-[200]">
              <button onClick={() => setBlockAnimationType(p => p === 'court' ? 'cut-in' : 'court')} className="bg-purple-600 px-4 py-2 text-white text-[10px] font-bold rounded shadow-lg border border-purple-400 opacity-50 hover:opacity-100">
                DEV: Block Anim = {blockAnimationType === 'court' ? 'ON-COURT' : 'CUT-IN'}
              </button>
            </div>
            {/* TOP HUD */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-start gap-10 z-50">
                {(() => {
                  const simCourtLineup = (() => {
                    if (draggingPlayerId && dragHoverSlotId && draggingPlayerId !== dragHoverSlotId) {
                      const idx1 = currentLineup.findIndex(p => p.id === draggingPlayerId);
                      const idx2 = currentLineup.findIndex(p => p.id === dragHoverSlotId);
                      if (idx1 !== -1 && idx2 !== -1) {
                        const lineup = [...currentLineup];
                        const temp = lineup[idx1];
                        lineup[idx1] = lineup[idx2];
                        lineup[idx2] = temp;
                        return lineup;
                      }
                    }
                    return null;
                  })();

                  const simCourtEff = (() => {
                    if (simCourtLineup) {
                      return computeEffective(simCourtLineup, matchState.playerStamina, matchState.userOffStrategy, matchState.userDefStrategy);
                    }
                    return null;
                  })();

                  const isPreviewMode = !!simCourtEff;
                  const uOff = simCourtEff ? simCourtEff.off : (matchState.effectiveUserOff || teamOffense);
                  const uDef = simCourtEff ? simCourtEff.def : (matchState.effectiveUserDef || teamDefense);
                  const uOffDir = uOff > matchState.prevUserOff ? '▲' : uOff < matchState.prevUserOff ? '▼' : '';
                  const uDefDir = uDef > matchState.prevUserDef ? '▲' : uDef < matchState.prevUserDef ? '▼' : '';
                  const aOff = matchState.effectiveAiOff || aiTeam.off;
                  const aDef = matchState.effectiveAiDef || aiTeam.def;
                  const aOffDir = aOff > matchState.prevAiOff ? '▲' : aOff < matchState.prevAiOff ? '▼' : '';
                  const aDefDir = aDef > matchState.prevAiDef ? '▲' : aDef < matchState.prevAiDef ? '▼' : '';
                  const dirColor = (d: string) => d === '▲' ? 'text-green-400' : d === '▼' ? 'text-red-400' : '';
                  const hasWarnings = matchState.strategyWarnings && matchState.strategyWarnings.length > 0;
                  return <>
                <div className="flex flex-col gap-2 items-center">
                  {isPreviewMode && (
                    <div className="bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold text-[8px] px-2 py-0.5 rounded animate-pulse uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                      Previewing Swap Impact...
                    </div>
                  )}
                  <div className={`bg-[#0c0c0e]/95 border p-2 rounded-lg flex items-center justify-around w-28 text-white transition-all duration-300 ${isPreviewMode ? 'border-cyan-400 shadow-[0_0_15px_#06b6d4] scale-105' : hasWarnings ? 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] animate-pulse' : 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]'}`}>
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[9px] text-gray-400 font-black tracking-widest">OFF</span>
                        <span className="text-sm font-extrabold text-cyan-400 font-mono">{uOff}</span>
                        <span className={`text-[10px] font-bold ${uOffDir === '▲' ? 'text-green-400' : uOffDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{uOffDir || '•'}</span>
                      </div>
                      <div className="h-6 w-px bg-gray-800/80" />
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[9px] text-gray-400 font-black tracking-widest">DEF</span>
                        <span className="text-sm font-extrabold text-cyan-400 font-mono">{uDef}</span>
                        <span className={`text-[10px] font-bold ${uDefDir === '▲' ? 'text-green-400' : uDefDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{uDefDir || '•'}</span>
                      </div>
                  </div>
                  <div className="w-24 h-6 bg-[#374151] rounded-full border border-gray-400 overflow-hidden relative shadow-lg">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out" style={{ width: `${matchState.userMomentum}%` }} />
                      <div className="absolute inset-0 flex items-center pl-3"><span className="text-white font-black text-[13px] drop-shadow-md">{Math.floor(matchState.userMomentum)}</span></div>
                  </div>
                  {hasWarnings && <div className="bg-orange-500/20 border border-orange-400 rounded px-2 py-0.5 text-[8px] text-orange-300 font-bold max-w-[160px] text-center">{matchState.strategyWarnings[0]}</div>}
                  {(() => {
                    const oopCount = (simCourtLineup || currentLineup).filter((p, i) => p.position !== SLOT_POSITIONS[i]).length;
                    if (oopCount === 0) return null;
                    return <div className="bg-red-600/30 border border-red-500 rounded px-2 py-0.5 text-[8px] text-red-300 font-bold animate-pulse">{oopCount} OUT OF POSITION (-{oopCount * 10}% stats)</div>;
                  })()}
                </div>

                {/* Center scoreboard styled after Spurs vs Thunder NBC sports layout */}
                {(() => {
                  const getQText = (q: number) => {
                    if (q === 1) return "1ST";
                    if (q === 2) return "2ND";
                    if (q === 3) return "3RD";
                    if (q === 4) return "4TH";
                    return `${q - 4}OT`;
                  };
                  const aiNick = selectedDifficulty === 'EASY' ? 'POR' : selectedDifficulty === 'NORMAL' ? 'NYK' : 'GSW';
                  const getAiGradient = () => {
                    if (selectedDifficulty === 'EASY') return 'from-[#a71930] to-[#5a0b17]'; // Blazers Crimson
                    if (selectedDifficulty === 'NORMAL') return 'from-[#0b3c5d] to-[#051e30]'; // Knicks Blue
                    return 'from-[#b0882e] to-[#674f17]'; // Warriors Gold
                  };
                  const getAiHeaderGrad = () => {
                    if (selectedDifficulty === 'EASY') return 'to-red-950/40';
                    if (selectedDifficulty === 'NORMAL') return 'to-blue-950/40';
                    return 'to-amber-950/40';
                  };
                  return (
                    <div className="flex flex-col items-center select-none shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
                      {/* USERNAME / IGN HEADER BAR (Futuristic Glowing Badges for Dynamic Gamer Tag Styles) */}
                      <div className="w-[500px] flex justify-between items-end px-1 mb-[-2px] relative z-10">
                        {/* User IGN Pill with neon glow & victory status signifiers */}
                        <div className="w-[230px] h-[28px] bg-gradient-to-t from-[#0c0c0e]/95 to-cyan-950/60 border-t border-x border-cyan-500/30 rounded-t-lg flex items-center justify-between px-3 shadow-[0_-5px_15px_rgba(6,182,212,0.1)]">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] text-yellow-400">👑</span>
                            <span className="text-[10px] font-black tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)] truncate font-mono uppercase">
                              nfrignaciostudent
                            </span>
                          </div>
                          <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded px-1 font-mono font-bold">HOME</span>
                        </div>

                        {/* Connector bridge */}
                        <div className="w-[30px] h-[16px] bg-[#0c0c0e] border-t border-x border-gray-800/80 rounded-t flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-80" />
                        </div>

                        {/* AI Opponent Name Pill with matching difficulty-themed glows */}
                        <div className={`w-[230px] h-[28px] bg-gradient-to-t from-[#0c0c0e]/95 ${getAiHeaderGrad()} border-t border-x border-red-500/30 rounded-t-lg flex items-center justify-between px-3 shadow-[0_-5px_15px_rgba(239,68,68,0.1)]`}>
                          <span className="text-[8px] bg-red-500/20 text-red-300 border border-red-400/30 rounded px-1 font-mono font-bold">AWAY</span>
                          <span className="text-[10px] font-black tracking-widest text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.85)] truncate font-mono uppercase text-right">
                            {aiTeam.name}
                          </span>
                        </div>
                      </div>

                      {/* Master Pill Scoreboard Container */}
                      <div className={`w-[500px] h-[72px] bg-[#0c0c0e]/95 border-2 rounded-t-xl flex items-stretch overflow-hidden relative transition-all duration-500 ${isClutchActive ? (isClutchHigh ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.55)]' : 'border-orange-500 shadow-[0_0_15px_rgba(251,146,60,0.45)]') : 'border-gray-800/80'}`}>
                        
                        {/* LEFT SIDE: Home / My Team */}
                        <div className="flex-1 bg-gradient-to-r from-[#24292e] to-[#121619] flex items-center justify-between px-3 border-r border-black/35 relative">


                          {/* Big Digital Score */}
                          <div className="flex-1 flex justify-end items-center pr-1 gap-2">
                            {matchState.possessionTeam === 'user' && (
                              <span className="text-[11px] filter drop-shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse select-none">🏀</span>
                            )}
                            <span className="text-3xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                              {displayUserScore}
                            </span>
                          </div>
                          
                          {/* Timeouts Remaining & Bonus Panel */}
                          <div className="absolute left-2.5 bottom-1 flex items-center gap-1.5 select-none pointer-events-none">
                            <div className="flex gap-[3px] items-center">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-[7px] h-[2.5px] rounded-sm transition-all duration-300 ${
                                    i < matchState.timeoutsLeft 
                                      ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]' 
                                      : 'bg-gray-800 border border-gray-950'
                                  }`}
                                />
                              ))}
                            </div>
                            {matchState.isInBonus?.user && (
                              <span className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded animate-pulse scale-90 border border-yellow-400/20">BONUS</span>
                            )}
                          </div>
                        </div>

                        {/* MIDDLE SECTION: Time / Clock Capsule */}
                        <div className="w-[140px] bg-[#060708] border-x-2 border-[#121417] flex flex-col items-center justify-center relative p-1">
                          {viewState === 'HALFTIME' ? (
                            <div className="w-[120px] h-[36px] bg-black border-2 border-[#f59e0b] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                              <span className="text-[#f59e0b] font-black tracking-widest text-xs uppercase shadow-black drop-shadow-md">HALFTIME {halftimeCountdown}s</span>
                            </div>
                          ) : (
                            <>
                              {/* Minimal live indicator */}
                              <div className="text-[7px] font-black text-gray-500 tracking-[0.25em] flex items-center gap-1.5 uppercase mb-0.5 select-none font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                                <span>LIVE</span>
                              </div>

                              {/* Big Game Clock */}
                              <div className="text-xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] leading-none my-0.5">
                                {Math.floor(displayClock / 60)}:{(displayClock % 60).toString().padStart(2, '0')}
                              </div>

                              {/* Bottom Row */}
                              <div className="w-full flex items-center justify-between px-3 mt-1 text-gray-400">
                                {/* Quarter */}
                                <span className="text-[9px] font-black font-mono text-gray-300 tracking-wider">
                                  {getQText(matchState.quarter)}
                                </span>
                                {/* Shot Clock (Possession Clock) — Hidden in the last seconds if game clock is less than shot clock (Real NBA Rule) */}
                                {displayPossClock < displayClock && displayClock > 0 ? (
                                  <span className={`text-[10px] font-black font-mono px-1 rounded tabular-nums ${displayPossClock <= 5 ? 'text-red-500 bg-red-500/10 border border-red-500/30 animate-pulse font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'text-amber-400 font-bold'}`}>
                                    {Math.ceil(displayPossClock)}
                                  </span>
                                ) : (
                                  <span className="w-[12px] h-[16px] inline-block" /> // Stable layout placeholder
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* RIGHT SIDE: Away / AI Team */}
                        <div className={`flex-1 bg-gradient-to-l ${getAiGradient()} flex items-center justify-between px-3 border-l border-black/35 relative transition-all duration-500`}>
                          
                          {/* Big Digital Score */}
                          <div className="flex-1 flex justify-start items-center pl-1 gap-2">
                            <span className="text-3xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                              {displayAiScore}
                            </span>
                            {matchState.possessionTeam === 'ai' && (
                              <span className="text-[11px] filter drop-shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse select-none">🏀</span>
                            )}
                          </div>

                          {/* Timeouts Remaining & Bonus Panel */}
                          <div className="absolute right-2.5 bottom-1 flex items-center gap-1.5 flex-row-reverse select-none pointer-events-none">
                            <div className="flex gap-[3px] items-center">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-[7px] h-[2.5px] rounded-sm transition-all duration-300 ${
                                    i < (matchState.aiTimeoutsLeft ?? 3)
                                      ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]' 
                                      : 'bg-gray-800 border border-gray-950'
                                  }`}
                                />
                              ))}
                            </div>
                            {matchState.isInBonus?.ai && (
                              <span className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded animate-pulse scale-90 border border-yellow-400/20">BONUS</span>
                            )}
                          </div>
                        </div>

                      </div>


                      {/* Dynamic Cheer/Rally Progress Bar under Scoreboard (Home court crowd energy dynamics) */}
                      <div className="w-[500px] px-4 py-2 bg-[#0a0c0e]/95 border-x-2 border-b-2 border-gray-800/80 rounded-b-xl flex flex-col gap-1 shadow-lg">
                        <div className="flex justify-between items-center text-[7px] font-black tracking-widest font-mono">
                          <span className={`${isHomeGame ? 'text-cyan-400 animate-pulse' : 'text-gray-400'}`}>MY TEAM CROWD ENERGY{isHomeGame ? ' [HOME]' : ''}</span>
                          <span className={`${!isHomeGame ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>{aiTeam.name.toUpperCase()} CROWD ENERGY{!isHomeGame ? ' [HOME]' : ''}</span>
                        </div>
                        <div className="w-full h-[6px] bg-gray-900 rounded-full overflow-hidden flex border border-black/50">
                          {/* User's energy segment (Cyan) */}
                          <div
                            className={`h-full transition-all duration-700 ease-out ${isHomeGame && uiRallyMode ? 'bg-orange-400 animate-pulse' : 'bg-cyan-500'}`}
                            style={{ width: `${userMomPct}%` }}
                          />
                          {/* AI's energy segment (Red) */}
                          <div
                            className={`h-full transition-all duration-700 ease-out ${!isHomeGame && uiRallyMode ? 'bg-orange-400 animate-pulse' : 'bg-red-500'}`}
                            style={{ width: `${100 - userMomPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}


                <div className="flex flex-col gap-2 items-center">
                  <div className="bg-[#0c0c0e]/95 border border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.2)] p-2 rounded-lg flex items-center justify-around w-28 text-white">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[9px] text-gray-400 font-black tracking-widest">OFF</span>
                        <span className="text-sm font-extrabold text-red-400 font-mono">{aOff}</span>
                        <span className={`text-[10px] font-bold ${aOffDir === '▲' ? 'text-green-400' : aOffDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{aOffDir || '•'}</span>
                      </div>
                      <div className="h-6 w-px bg-gray-800/80" />
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[9px] text-gray-400 font-black tracking-widest">DEF</span>
                        <span className="text-sm font-extrabold text-red-400 font-mono">{aDef}</span>
                        <span className={`text-[10px] font-bold ${aDefDir === '▲' ? 'text-green-400' : aDefDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{aDefDir || '•'}</span>
                      </div>
                  </div>
                  <div className="w-24 h-6 bg-[#374151] rounded-full border border-gray-400 overflow-hidden relative shadow-lg">
                      <div className="h-full bg-gradient-to-l from-yellow-400 to-orange-500 transition-all duration-500 ease-out absolute right-0" style={{ width: `${matchState.aiMomentum}%` }} />
                      <div className="absolute inset-0 flex items-center justify-end pr-3"><span className="text-white font-black text-[13px] drop-shadow-md">{Math.floor(matchState.aiMomentum)}</span></div>
                  </div>
                </div>
                  </>;
                })()}
            </div>

            {/* EXIT BUTTON */}
            <div className="absolute top-8 right-8 z-50">
              <button onClick={handleReturn} className="bg-red-600/90 hover:bg-red-500 text-white w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center cursor-pointer transition-colors border border-red-300 shadow-[0_0_15px_rgba(220,38,38,0.5)]">✕</button>
            </div>

            {/* PLAYERS */}
            {currentLineup.map((p, idx) => renderPlayerCard(p, false, SLOT_POSITIONS[idx]))}
            {matchState.aiLineupIds.map((id, idx) => {
              const p = aiTeam.roster.find(r => r.id === id);
              if (!p) return null;
              return renderPlayerCard(p, true, SLOT_POSITIONS[idx]);
            })}

            {/* SCORING RUN OVERLAY */}
            <RunOverlay activeRunOverlay={activeRunOverlay} aiTeamName={aiTeam.name} />

            {/* FREE THROW OVERLAY — removed from top center to avoid overlap with TV scoreboard, rendered directly on the shooting player card */}

            {/* OT TRANSITION OVERLAY */}
            {showOTTransition && (
              <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
                <div className="flex flex-col items-center animate-[float-up_2s_ease-out_forwards]">
                  <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] tracking-widest italic">
                    {matchState.quarter === 5 ? 'OVERTIME' : `${matchState.quarter - 4}OT`}
                  </div>
                  <div className="text-xl text-white font-bold mt-2">The game continues...</div>
                </div>
              </div>
            )}

            {/* SHOOTOUT OVERLAY */}
            {matchState.shootoutSequence && (() => {
              const so = matchState.shootoutSequence;
              const revealed = shootoutRevealCount;
              return (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#0d1117] border-2 border-red-500 rounded-xl p-6 w-[600px] shadow-[0_0_50px_rgba(239,68,68,0.4)] flex flex-col items-center">
                    <h2 className="text-3xl font-black text-red-500 tracking-widest mb-2 italic drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">SUDDEN DEATH SHOOTOUT</h2>
                    <p className="text-gray-400 text-xs mb-6 uppercase tracking-widest font-bold">First to miss loses</p>
                    
                    <div className="flex justify-between w-full mb-8">
                      {/* User Column */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="text-cyan-400 font-black text-lg mb-4 truncate w-full text-center">MY TEAM</div>
                        <div className="flex flex-col gap-3">
                          {so.results.map((r, i) => {
                            const isRevealed = i < revealed;
                            const isCurrent = i === Math.floor(revealed);
                            return (
                              <div key={`u${i}`} className="flex items-center gap-3 w-48 bg-white/5 p-2 rounded border border-white/10">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${isRevealed ? (r.userMade ? 'border-green-500 bg-green-500/20 text-green-500' : 'border-red-500 bg-red-500/20 text-red-500') : (isCurrent ? 'border-yellow-400 animate-pulse bg-yellow-400/20 text-yellow-400' : 'border-gray-600 text-gray-600')}`}>
                                  {isRevealed ? (r.userMade ? '✓' : '✗') : '•'}
                                </div>
                                <span className="text-white text-xs font-bold truncate flex-1">{r.userPlayerName.split(' ').pop()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col justify-center px-4 font-black text-gray-600 italic text-2xl">VS</div>

                      {/* AI Column */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="text-red-400 font-black text-lg mb-4 truncate w-full text-center">{aiTeam.name.toUpperCase()}</div>
                        <div className="flex flex-col gap-3">
                          {so.results.map((r, i) => {
                            const isRevealed = i < revealed;
                            const isCurrent = i === Math.floor(revealed);
                            return (
                              <div key={`a${i}`} className="flex items-center justify-end gap-3 w-48 bg-white/5 p-2 rounded border border-white/10">
                                <span className="text-white text-xs font-bold truncate flex-1 text-right">{r.aiPlayerName.split(' ').pop()}</span>
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${isRevealed ? (r.aiMade ? 'border-green-500 bg-green-500/20 text-green-500' : 'border-red-500 bg-red-500/20 text-red-500') : (isCurrent ? 'border-yellow-400 animate-pulse bg-yellow-400/20 text-yellow-400' : 'border-gray-600 text-gray-600')}`}>
                                  {isRevealed ? (r.aiMade ? '✓' : '✗') : '•'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {revealed >= so.results.length && (
                      <div className={`text-2xl font-black mt-2 p-3 w-full text-center rounded border ${so.winner === 'user' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                        {so.winner === 'user' ? 'MY TEAM WINS THE SHOOTOUT!' : `${aiTeam.name.toUpperCase()} WINS THE SHOOTOUT!`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* BOTTOM HUD CONTAINER (Groups Chat, Logs, and Actions tightly) */}
            <div className="absolute bottom-6 left-6 right-6 z-50 flex gap-3 items-end xl:justify-center">
                
                {/* BOTTOM HUD - CHAT */}
                <div className="w-[280px] bg-slate-800/95 rounded p-2 text-white border border-gray-600 shadow-xl shrink-0">
                    <div className="flex gap-2 mb-2">
                        <button className="bg-gray-700 px-3 py-1 text-[10px] rounded font-bold uppercase">Global</button>
                        <button className="bg-blue-600 px-3 py-1 text-[10px] rounded font-bold uppercase">Match</button>
                    </div>
                    <div className="h-28 bg-black/40 p-2 text-[11px] overflow-y-auto font-mono">
                        <p><span className="text-blue-400">System:</span> Match started!</p>
                    </div>
                </div>

                {/* BOTTOM HUD - LOGS + STATISTICS */}
                <div className="flex-1 max-w-[740px] bg-slate-900/98 rounded-lg overflow-hidden border border-gray-700/80 shadow-2xl flex flex-col h-[166px]" style={{backdropFilter:'blur(8px)'}}>
                    {/* Tab bar */}
                    <div className="flex items-center bg-[#0d1520] border-b border-gray-700/60 text-[11px] font-bold">
                        <button onClick={() => setActiveLogTab('pbp')} className={`px-5 py-2 transition-all border-r border-gray-700/60 ${activeLogTab === 'pbp' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer'}`}>▶ Play by Play</button>
                        <button onClick={() => setActiveLogTab('stats')} className={`px-5 py-2 transition-all ${activeLogTab === 'stats' ? 'bg-[#1e3a5f] text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer'}`}>Statistics</button>
                        {activeLogTab === 'stats' && (
                          <div className="flex items-center gap-1 ml-auto pr-2">
                            <button onClick={() => setStatsTeam('user')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsTeam === 'user' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300'}`}>● MY TEAM</button>
                            <button onClick={() => setStatsTeam('ai')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsTeam === 'ai' ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 'text-gray-500 hover:text-gray-300'}`}>● {aiTeam.name.split(' ').slice(-1)[0].toUpperCase()}</button>
                            <span className="text-gray-700 mx-1">|</span>
                            <button onClick={() => setStatsFilter('starters')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsFilter === 'starters' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-gray-500 hover:text-gray-300'}`}>COURT</button>
                            <button onClick={() => setStatsFilter('bench')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsFilter === 'bench' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-gray-500 hover:text-gray-300'}`}>BENCH</button>
                          </div>
                        )}
                    </div>

                    {activeLogTab === 'pbp' ? (
                      <div className="flex-1 pt-3 px-3 pb-0 bg-slate-900 text-[11px] overflow-y-auto no-scrollbar flex flex-col justify-end">
                        <div className="space-y-1.5 pb-2">
                          {[...displayEvents].reverse().map(ev => (
                            <p key={ev.id}>
                              <span className="text-yellow-400 font-bold">{ev.time}</span> -
                              <span className={`font-bold ml-1 ${ev.isUserTeam ? 'text-cyan-400' : 'text-red-400'}`}>{ev.isUserTeam ? 'My Team' : aiTeam.name}</span>
                              <span className="text-gray-200 ml-1">{ev.text}</span>
                            </p>
                          ))}
                          <div ref={logEndRef} />
                        </div>
                      </div>
                    ) : (() => {
                      // Build player list for selected team + filter
                      const userOnCourt = new Set(currentLineup.map(p => p.id));
                      const allUserIds = matchState.userPlayerIds.length > 0 ? matchState.userPlayerIds : currentLineup.map(p => p.id);
                      const allAiIds = aiTeam.roster.map(p => p.id);
                      let players: typeof roster = [];
                      if (statsTeam === 'user') {
                        const pool = roster.filter(p => allUserIds.includes(p.id));
                        players = statsFilter === 'starters' ? pool.filter(p => userOnCourt.has(p.id)) : pool.filter(p => !userOnCourt.has(p.id));
                      } else {
                        const activeAiIds = new Set(matchState.aiLineupIds);
                        players = statsFilter === 'starters'
                          ? aiTeam.roster.filter(p => activeAiIds.has(p.id))
                          : aiTeam.roster.filter(p => !activeAiIds.has(p.id));
                      }
                      const gs = (pid: string) => matchState.playerStats[pid] ?? { PTS:0,REB:0,AST:0,STL:0,TOV:0,BLK:0,OREB:0,DREB:0,FOL:0,FTA:0,FTM:0 };
                      const stam = (pid: string) => Math.floor(matchState.playerStamina[pid] ?? 100);
                      // Stat leaders for highlighting
                      const allSrcIds = statsTeam === 'user' ? allUserIds : allAiIds;
                      const maxPts = Math.max(0, ...allSrcIds.map(id => gs(id).PTS));
                      const maxReb = Math.max(0, ...allSrcIds.map(id => gs(id).REB));
                      const maxAst = Math.max(0, ...allSrcIds.map(id => gs(id).AST));
                      const maxStl = Math.max(0, ...allSrcIds.map(id => gs(id).STL));
                      const isHot = (pid: string) => matchState.hotPlayers[pid];
                      const stamColor = (s: number) => s > 60 ? '#22c55e' : s > 30 ? '#eab308' : '#ef4444';
                      const teamColor = statsTeam === 'user' ? '#06b6d4' : '#f87171';
                      return (
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                          <table className="w-full text-[10px] border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-[#0d1520] text-gray-400 uppercase tracking-wider">
                                <th className="text-left px-3 py-1.5 font-bold w-28">Player</th>
                                <th className="px-1 py-1.5 font-bold w-16">Energy</th>
                                <th className="px-2 py-1.5 font-bold">FGM-A</th>
                                <th className="px-2 py-1.5 font-bold">3PM-A</th>
                                <th className="px-2 py-1.5 font-bold">FTM-A</th>
                                <th className="px-2 py-1.5 font-bold">REB</th>
                                <th className="px-2 py-1.5 font-bold">AST</th>
                                <th className="px-2 py-1.5 font-bold">STL</th>
                                <th className="px-2 py-1.5 font-bold">BLK</th>
                                <th className="px-2 py-1.5 font-bold">TO</th>
                                <th className="px-2 py-1.5 font-bold">PF</th>
                                <th className="px-2 py-1.5 font-bold">+/-</th>
                                <th className="px-2 py-1.5 font-bold">TS%</th>
                                <th className="px-2 py-1.5 font-bold text-yellow-400">PTS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {players.length === 0 && (
                                <tr><td colSpan={14} className="text-center text-gray-600 py-4 text-[10px]">No players in this group</td></tr>
                              )}
                              {players.map((p, i) => {
                                const s = gs(p.id);
                                const st = stam(p.id);
                                const stMax = getPlayerMaxStamina(p);
                                const stPct = getStaminaPercent(p, st);
                                const hot = isHot(p.id);
                                const isLeadPts = s.PTS === maxPts && maxPts > 0;
                                const isLeadReb = s.REB === maxReb && maxReb > 0;
                                const isLeadAst = s.AST === maxAst && maxAst > 0;
                                const isLeadStl = s.STL === maxStl && maxStl > 0;
                                const isDD = s.PTS >= 10 && s.REB >= 10;
                                const inFoulTrouble = s.FOL >= 4;
                                const rowBg = i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]';
                                return (
                                  <tr key={p.id} className={`${rowBg} border-b border-gray-800/60 transition-colors hover:bg-white/5`}>
                                    {/* Player name */}
                                    <td className="px-3 py-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold truncate max-w-[80px]" style={{color: teamColor}}>
                                          {p.name.split(' ').map((n,i) => i===0 ? n[0]+'.' : n).join(' ')}
                                        </span>
                                        {isDD && <span className="text-[7px] bg-yellow-500/20 text-yellow-400 px-0.5 rounded font-black">DD</span>}
                                        {inFoulTrouble && <span className="text-[7px] bg-red-500/20 text-red-400 px-0.5 rounded font-black animate-pulse">{s.FOL}F</span>}
                                      </div>
                                      <div className="text-[8px] text-gray-600">{p.position} · {p.ovr}</div>
                                    </td>
                                    {/* Energy bar */}
                                    <td className="px-1 py-1.5">
                                      <div className="flex items-center gap-1">
                                          <div className="w-10 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{width:`${stPct}%`, background: stamColor(stPct)}} />
                                        </div>
                                        <span className="text-[9px] font-bold tabular-nums" style={{color: stamColor(stPct)}} title={`${Math.floor(stPct)}% stamina`}>{st}/{stMax}</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-center text-gray-300">{s.FGM ?? 0}/{s.FGA ?? 0}</td>
                                    <td className="px-2 py-1.5 text-center text-gray-300">{s.TPM ?? 0}/{s.TPA ?? 0}</td>
                                    <td className="px-2 py-1.5 text-center text-gray-300">{s.FTM ?? 0}/{s.FTA ?? 0}</td>
                                    <td className={`px-2 py-1.5 font-bold ${isLeadReb ? 'text-cyan-400' : 'text-gray-300'}`}>
                                      <div className="flex items-center justify-center gap-0.5">{s.REB}{isLeadReb && <span className="text-[9px] leading-none">★</span>}</div>
                                    </td>
                                    <td className={`px-2 py-1.5 font-bold ${isLeadAst ? 'text-purple-400' : 'text-gray-300'}`}>
                                      <div className="flex items-center justify-center gap-0.5">{s.AST}{isLeadAst && <span className="text-[9px] leading-none">★</span>}</div>
                                    </td>
                                    <td className={`px-2 py-1.5 font-bold ${isLeadStl ? 'text-green-400' : 'text-gray-300'}`}>
                                      <div className="flex items-center justify-center gap-0.5">{s.STL}{isLeadStl && <span className="text-[9px] leading-none">★</span>}</div>
                                    </td>
                                    <td className="px-2 py-1.5 text-center text-gray-300">{s.BLK ?? 0}</td>
                                    <td className={`px-2 py-1.5 text-center ${(s.TOV ?? 0) >= 4 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>{s.TOV ?? 0}</td>
                                    <td className={`px-2 py-1.5 text-center ${inFoulTrouble ? 'text-red-400 font-bold animate-pulse' : 'text-gray-400'}`}>{s.FOL ?? 0}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-gray-300" style={{color: (s.plusMinus ?? 0) > 0 ? '#4ade80' : (s.plusMinus ?? 0) < 0 ? '#f87171' : '#9ca3af'}}>
                                      {(s.plusMinus ?? 0) > 0 ? `+${s.plusMinus}` : s.plusMinus}
                                    </td>
                                    <td className="px-2 py-1.5 text-center font-bold text-gray-300" style={{color: (() => {
                                      const tsVal = calculateTS(s);
                                      if (tsVal === '—') return '#9ca3af';
                                      const tsNum = parseFloat(tsVal);
                                      if (tsNum > 100.0) return '#f59e0b'; // Gold/Orange (Exceptional)
                                      if (tsNum >= 65.0) return '#22c55e'; // Green (Efficient)
                                      if (tsNum >= 50.0) return '#f3f4f6'; // White (Average)
                                      return '#ef4444'; // Red (Struggling)
                                    })()}}>
                                      {(() => {
                                        const tsVal = calculateTS(s);
                                        if (tsVal === '—') return '—';
                                        const tsNum = parseFloat(tsVal);
                                        return `${tsVal}%${tsNum > 100.0 ? ' [EFF]' : ''}`;
                                      })()}
                                    </td>
                                    <td className={`px-2 py-1.5 font-black text-sm ${isLeadPts ? 'text-yellow-400' : 'text-white'}`}>
                                      <div className="flex items-center justify-center gap-0.5">{isLeadPts && <span className="text-[10px] leading-none">👑</span>}<span>{s.PTS}</span></div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                </div>
                
                {/* BOTTOM HUD - ACTION BAR Container */}
                <div className="flex gap-2 items-end shrink-0">
                    
                    {/* Action Panel */}
                    <div className="flex flex-col gap-1 w-[132px]">
                        {/* 2x2 Action Panel */}
                        <div className="bg-[#1a2436] rounded-xl p-3 shadow-2xl flex flex-col border border-gray-700/30">
                            <div className="text-white font-bold text-[13px] text-center mb-2 tracking-wide">Audience: {(matchState.audience || 0).toLocaleString()}</div>
                            <div className="bg-[#101722] rounded-lg p-1.5 grid grid-cols-2 gap-1.5">
                                {/* SUB */}
                                <button onClick={() => openModal('sub')} className="bg-[#f27420] hover:bg-[#ff893b] text-white w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 justify-self-center relative">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
                                      <path d="M16 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
                                      <path d="M8 14c-2.33 0-7 1.17-7 3.5V20h10v-2.5c0-2.33-4.67-3.5-7-3.5zm13 1h-3.5v-2l-4 3 4 3v-2H21v-2z"/>
                                    </svg>
                                    {cooldownNow < subCooldownEnd && (
                                        <div className="absolute inset-0 bg-black/80 rounded flex flex-col items-center justify-center text-[11px] font-black text-orange-400">
                                            <span>{Math.ceil((subCooldownEnd - cooldownNow) / 1000)}s</span>
                                            <span className="text-[6px] text-gray-400 uppercase tracking-widest leading-none">CD</span>
                                        </div>
                                    )}
                                </button>
                                {/* STRAT */}
                                <button onClick={() => openModal('strategy')} className="bg-[#f27420] hover:bg-[#ff893b] text-white w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 justify-self-center">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                      <rect x="2" y="2" width="20" height="20" rx="2" fill="white" />
                                      <circle cx="12" cy="12" r="4" fill="none" stroke="#f27420" strokeWidth="1.5" />
                                      <path d="M12 2v20" stroke="#f27420" strokeWidth="1.5" strokeDasharray="2 2" />
                                      <circle cx="6" cy="6" r="1.5" fill="#f27420" />
                                      <circle cx="18" cy="18" r="1.5" fill="#f27420" />
                                      <path d="M6 7l4 3M18 17l-4-3" stroke="#f27420" strokeWidth="1.5" />
                                    </svg>
                                </button>
                                {/* TIMEOUT */}
                                <button onClick={handleTimeout} disabled={matchState.timeoutsLeft <= 0 || timeoutCountdown > 0}
                                    className={`${matchState.timeoutsLeft > 0 && timeoutCountdown === 0 ? 'bg-[#f27420] hover:bg-[#ff893b] cursor-pointer hover:scale-105 active:scale-95' : 'bg-[#a6621a] cursor-not-allowed opacity-90'} text-white w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm relative justify-self-center`}>
                                    {timeoutCountdown > 0
                                      ? <><span className="text-lg font-black leading-none">{timeoutCountdown}</span><span className="text-[6px] font-black tracking-wider leading-none">WAIT</span></>
                                      : <>
                                          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                            <circle cx="12" cy="12" r="11" fill="none" stroke="white" strokeWidth="2.5" />
                                            <rect x="8" y="7" width="3" height="10" fill="white" />
                                            <rect x="13" y="7" width="3" height="10" fill="white" />
                                          </svg>
                                        </>
                                    }
                                </button>
                                {/* BOOST */}
                                <button onClick={() => openModal('energydrink')} disabled={matchState.energyDrinksLeft <= 0}
                                    className={`${matchState.energyDrinksLeft > 0 ? 'bg-[#f27420] hover:bg-[#ff893b] cursor-pointer hover:scale-105 active:scale-95' : 'bg-[#a6621a] cursor-not-allowed opacity-90'} text-[#e0e0e0] w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm relative justify-self-center`}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" transform="rotate(30)">
                                      <path d="M8 2h8v2h-1l-1 2v14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6L7 4H6V2zm2 5v2h4V7h-4zm2 8a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* ENERGY DRINK MODAL */}
            {showEnergyDrinkModal && (() => {
              const staminaColor = (val: number) => val > 60 ? 'bg-green-500' : val > 30 ? 'bg-yellow-500' : 'bg-red-500';
              const gts = (matchState.quarter - 1) * 720 + (720 - matchState.clock);
              const anyLow = currentLineup.some(p => getStaminaPercent(p, matchState.playerStamina[p.id]) < 40);
              const allFresh = currentLineup.every(p => getStaminaPercent(p, matchState.playerStamina[p.id]) > 60);
              const selectedLocked = energyDrinkPick ? (() => { const lu = matchState.energyDrinkLocked[energyDrinkPick]; return !!lu && gts < lu; })() : false;
              return (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-md z-[200] flex items-center justify-center transition-all">
                  <div className="bg-[#1a2332] border-2 border-green-500/60 rounded-xl w-[480px] p-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-xl font-black text-white tracking-widest">ENERGY BOOST</h2>
                      <button onClick={closeModal} className="text-white text-2xl hover:text-red-400 cursor-pointer">✕</button>
                    </div>
                    <p className="text-gray-400 text-xs mb-1">{matchState.energyDrinksLeft} remaining - Choose a player to restore +{MATCH_STAMINA_UI_CONFIG.energyDrinkRecovery} stamina</p>
                    {anyLow && <p className="text-yellow-400 text-[10px] mb-3 font-bold">Best use: target players below 40 stamina</p>}
                    {allFresh && <p className="text-amber-500 text-[10px] mb-3 font-bold">All players fresh — consider saving boosts for Q4</p>}
                    <div className="space-y-2 mb-4">
                      {currentLineup.map(p => {
                        const stam = matchState.playerStamina[p.id] ?? 100;
                        const stamPct = getStaminaPercent(p, stam);
                        const lockedUntil = matchState.energyDrinkLocked[p.id];
                        const isLocked = !!lockedUntil && gts < lockedUntil;
                        const lockRem = isLocked ? Math.max(0, lockedUntil - gts) : 0;
                        const isLow = stamPct < 40;
                        return (
                          <button key={p.id}
                            onClick={() => !isLocked && setEnergyDrinkPick(p.id)}
                            disabled={isLocked}
                            className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 text-left transition-all
                              ${isLocked ? 'opacity-40 cursor-not-allowed border-gray-600 bg-gray-900/50'
                              : energyDrinkPick === p.id ? 'border-green-400 bg-green-500/10 cursor-pointer'
                              : 'border-gray-700 bg-[#0f1923] hover:border-gray-500 cursor-pointer'}`}>
                            <div className="bg-[#d87625] text-white text-[10px] font-black px-2 py-0.5 rounded">{p.position}</div>
                            <div className="flex-1">
                              <div className="text-white text-sm font-bold flex items-center gap-1">
                                {p.name}
                                {isLow && !isLocked && <span className="text-yellow-400 text-[10px] font-bold ml-1">LOW</span>}
                                {isLocked && <span className="text-gray-400 text-[10px] ml-1">{lockRem}s</span>}
                              </div>
                              <div className="flex gap-2 text-[10px] mt-0.5">
                                <span className="text-gray-400">OVR <b className="text-white">{p.ovr}</b></span>
                                <span className={`font-bold ${stamPct < 40 ? 'text-red-400' : stamPct < 60 ? 'text-yellow-400' : 'text-green-400'}`}>{Math.floor(stam)} STA</span>
                              </div>
                              <div className="w-full h-2 bg-gray-800 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${staminaColor(stamPct)}`} style={{ width: `${stamPct}%` }} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEnergyDrinkConfirm}
                        disabled={!energyDrinkPick || selectedLocked}
                        className={`flex-1 py-2 rounded-lg font-black text-sm tracking-widest transition-all
                          ${energyDrinkPick && !selectedLocked
                            ? 'bg-green-500 text-white hover:bg-green-400 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                        CONFIRM
                      </button>
                      <button onClick={closeModal} className="flex-1 py-2 rounded-lg font-black text-sm bg-gray-700 text-white hover:bg-gray-600 cursor-pointer">CANCEL</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* STRATEGY MODAL */}
            {showStrategyModal && (
              <div className="absolute inset-0 bg-black/45 backdrop-blur-md z-[200] flex items-center justify-center transition-all">
                <div className="bg-[#1a2332] border-2 border-yellow-500/60 rounded-xl w-[900px] max-h-[700px] overflow-y-auto p-6 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white tracking-widest">STRATEGY</h2>
                        <button onClick={closeModal} className="text-white text-2xl hover:text-red-400 cursor-pointer">✕</button>
                    </div>
                    {/* Offense */}
                    <h3 className="text-yellow-400 font-bold text-sm tracking-widest mb-3 uppercase">Offense Strategies</h3>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {Object.entries(OFFENSIVE_STRATEGIES).map(([name, mods]) => {
                            const isActive = matchState.userOffStrategy === name;
                            const onCooldown = cooldownNow < offCooldownEnd && !isActive;
                            const cdSec = Math.ceil((offCooldownEnd - cooldownNow) / 1000);
                            return (
                                <button key={name} onClick={() => handleOffStrategyChange(name)}
                                    className={`relative p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${isActive ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-gray-700 bg-[#0f1923] hover:border-gray-500'} ${onCooldown ? 'opacity-40' : ''}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-white font-bold text-sm">{name}</span>
                                        <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded">BASE</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {['C','PF','SF','SG','PG'].map(pos => {
                                            const val = Math.round((mods[pos] || 1) * 100);
                                            return <span key={pos} className={`text-[10px] font-bold px-2 py-0.5 rounded ${val > 100 ? 'bg-yellow-500/20 text-yellow-400' : val < 100 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{pos} {val}%</span>;
                                        })}
                                    </div>
                                    {onCooldown && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><span className="text-red-400 font-bold text-lg">{cdSec}s</span></div>}
                                </button>
                            );
                        })}
                    </div>
                    {/* Defense */}
                    <h3 className="text-yellow-400 font-bold text-sm tracking-widest mb-3 uppercase">Defense Strategies</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(DEFENSIVE_STRATEGIES).map(([name, mods]) => {
                            const isActive = matchState.userDefStrategy === name;
                            const onCooldown = cooldownNow < defCooldownEnd && !isActive;
                            const cdSec = Math.ceil((defCooldownEnd - cooldownNow) / 1000);
                            return (
                                <button key={name} onClick={() => handleDefStrategyChange(name)}
                                    className={`relative p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${isActive ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-gray-700 bg-[#0f1923] hover:border-gray-500'} ${onCooldown ? 'opacity-40' : ''}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-white font-bold text-sm">{name}</span>
                                        <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded">BASE</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {['C','PF','SF','SG','PG'].map(pos => {
                                            const val = Math.round((mods[pos] || 1) * 100);
                                            return <span key={pos} className={`text-[10px] font-bold px-2 py-0.5 rounded ${val > 100 ? 'bg-yellow-500/20 text-yellow-400' : val < 100 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{pos} {val}%</span>;
                                        })}
                                    </div>
                                    {onCooldown && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><span className="text-red-400 font-bold text-lg">{cdSec}s</span></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
              </div>
            )}

            <SubstitutionModal
              show={showSubModal}
              onClose={closeModal}
              matchRoster={matchRoster}
              currentLineup={currentLineup}
              activeLineup={activeLineup}
              activeReserves={activeReserves}
              matchState={matchState}
              cooldownNow={cooldownNow}
              subCooldownEnd={subCooldownEnd}
              subCourtPick={subCourtPick}
              subBenchPick={subBenchPick}
              onConfirm={handleSubConfirm}
              dragHoverSlotId={dragHoverSlotId}
              draggingPlayerId={draggingPlayerId}
              setPotentialDragPlayerId={setPotentialDragPlayerId}
              setDragStartPos={setDragStartPos}
              computeEffective={computeEffective}
              SLOT_POSITIONS={SLOT_POSITIONS}
              courtPositions={courtPositions}
              getPlayerImage={getPlayerImage}
              getPlayerMaxStamina={getPlayerMaxStamina}
            />
        </div>
      </div>
    );
  }

  // Helper: box score table component
  const BoxScoreTable = ({ players, label, color }: { players: Player[], label: string, color: string }) => {
    const allStats = players.map(p => ({ ...p, stats: getDisplayStats(p.id), stam: Math.floor(matchState.playerStamina[p.id] ?? 100) }));
    const maxPts = Math.max(...allStats.map(s => s.stats.PTS), 0);
    return (
      <div className="mb-4">
        <h3 className={`text-sm font-black tracking-widest mb-2 ${color}`}>{label}</h3>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1 px-2">NAME</th>
              <th className="px-1">POS</th>
              <th className="px-1">OVR</th>
              <th className="px-1">PTS</th>
              <th className="px-1">REB</th>
              <th className="px-1">AST</th>
              <th className="px-1">STL</th>
              <th className="px-1">BLK</th>
              <th className="px-1">TOV</th>
              <th className="px-1">FT</th>
              <th className="px-1">FOL</th>
              <th className="px-1">+/-</th>
              <th className="px-1">TS%</th>
              <th className="px-1">STA%</th>
            </tr>
          </thead>
          <tbody>
            {allStats.map(p => {
              const staminaPct = Math.floor(getStaminaPercent(p, p.stam));
              const isLeader = p.stats.PTS === maxPts && maxPts > 0;
              const isHot = p.stats.PTS >= 20;
              const isLock = p.stats.STL >= 2;
              const isBoard = p.stats.REB >= 10;
              const isDD = p.stats.PTS >= 10 && p.stats.REB >= 10;
              const isTD = isDD && p.stats.AST >= 10;
              const rowBorder = isTD ? 'border-2 border-transparent bg-clip-padding' : isDD ? 'border border-yellow-500/40' : 'border-b border-gray-800';
              const rowBg = isTD ? 'bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-yellow-500/10' : isLeader ? 'bg-yellow-500/10' : '';
              const isOrebHustle = (p.stats.OREB ?? 0) >= 4;
              return (
                <tr key={p.id} className={`${rowBorder} ${rowBg}`} style={isTD ? { borderImage: 'linear-gradient(90deg, #a855f7, #06b6d4, #eab308) 1' } : undefined}>
                  <td className={`py-1.5 px-2 font-bold ${isLeader ? 'text-yellow-400' : 'text-white'}`}>
                    {isLeader && '👑 '}{p.name}
                    {isTD && <span className="ml-1 text-[8px] bg-gradient-to-r from-purple-500 to-cyan-400 text-white px-1.5 py-0.5 rounded-full font-black">TRIPLE DOUBLE</span>}
                  </td>
                  <td className="text-center text-gray-400">{p.position}</td>
                  <td className="text-center text-white font-bold">{p.ovr}</td>
                  <td className={`text-center font-bold ${isLeader ? 'text-yellow-400' : 'text-white'}`}>{p.stats.PTS}</td>
                  <td className={`text-center ${isBoard ? 'text-cyan-400 font-bold' : 'text-gray-300'}`} title={`${p.stats.OREB ?? 0}o / ${p.stats.DREB ?? 0}d`}>{p.stats.REB}</td>
                  <td className="text-center text-gray-300">{p.stats.AST}</td>
                  <td className={`text-center ${isLock ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>{p.stats.STL}</td>
                  <td className={`text-center ${(p.stats.BLK ?? 0) >= 3 ? 'text-purple-400 font-bold' : 'text-gray-300'}`}>{p.stats.BLK ?? 0}</td>
                  <td className={`text-center ${(p.stats.TOV ?? 0) >= 5 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{p.stats.TOV ?? 0}</td>
                  <td className="text-center text-gray-300">{p.stats.FTM ?? 0}/{p.stats.FTA ?? 0}</td>
                  <td className={`text-center ${(p.stats.FOL ?? 0) >= 4 ? 'text-red-400 font-bold animate-pulse' : 'text-gray-300'}`}>{p.stats.FOL ?? 0}</td>
                  <td className="text-center font-bold" style={{color: (p.stats.plusMinus ?? 0) > 0 ? '#4ade80' : (p.stats.plusMinus ?? 0) < 0 ? '#f87171' : '#9ca3af'}}>
                    {(p.stats.plusMinus ?? 0) > 0 ? `+${p.stats.plusMinus}` : p.stats.plusMinus}
                  </td>
                  <td className="text-center font-bold" style={{color: (() => {
                    const tsVal = calculateTS(p.stats);
                    if (tsVal === '—') return '#9ca3af';
                    const tsNum = parseFloat(tsVal);
                    if (tsNum > 100.0) return '#f59e0b'; // Gold/Orange (Exceptional)
                    if (tsNum >= 65.0) return '#22c55e'; // Green (Efficient)
                    if (tsNum >= 50.0) return '#f3f4f6'; // White (Average)
                    return '#ef4444'; // Red (Struggling)
                  })()}}>
                    {(() => {
                      const tsVal = calculateTS(p.stats);
                      if (tsVal === '—') return '—';
                      const tsNum = parseFloat(tsVal);
                      return `${tsVal}%${tsNum > 100.0 ? ' 🔥' : ''}`;
                    })()}
                  </td>
                  <td className={`text-center font-bold ${staminaPct < 25 ? 'text-red-500 animate-pulse' : staminaPct < 50 ? 'text-yellow-400' : 'text-gray-400'}`}>{staminaPct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };


  // POST GAME VIEW
  if (viewState === 'POST_GAME' && reward) {
    const isWin = matchState.userScore >= matchState.aiScore;
    const allUserPlayers = matchRoster.filter(p => matchState.userPlayerIds.includes(p.id));

    // MVP calculation
    const mvpCalc = allUserPlayers.map(p => {
      const s = getDisplayStats(p.id);
      return { player: p, stats: s, score: s.PTS + s.REB * 0.5 + s.AST * 0.7 + s.STL * 1.2 + (s.BLK ?? 0) * 1.0 - (s.TOV ?? 0) * 0.5 };
    }).sort((a, b) => b.score - a.score);
    const mvp = mvpCalc[0];

    // Leaders
    const scoringLeader = allUserPlayers.map(p => ({ p, s: getDisplayStats(p.id) })).sort((a, b) => b.s.PTS - a.s.PTS)[0];
    const reboundLeader = allUserPlayers.map(p => ({ p, s: getDisplayStats(p.id) })).sort((a, b) => b.s.REB - a.s.REB)[0];
    const assistLeader = allUserPlayers.map(p => ({ p, s: getDisplayStats(p.id) })).sort((a, b) => b.s.AST - a.s.AST)[0];

    // Top user and AI player images for VS display
    const userTopScorer = allUserPlayers.map(p => ({ p, pts: getDisplayStats(p.id).PTS })).sort((a, b) => b.pts - a.pts)[0];
    const aiTopScorer = aiTeam.roster.map(p => ({ p, pts: getDisplayStats(p.id).PTS })).sort((a, b) => b.pts - a.pts)[0];

    const qs = matchState.quarterScores;



    return (
      <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center font-sans overflow-hidden">
        {/* Background court image dimmed */}
        <div className="absolute inset-0 bg-[url('/court_bg.png')] bg-cover bg-center opacity-[0.08]" />

        {/* WIN label — left of center card */}
        <div className={`absolute top-[18%] left-[22%] text-8xl font-black tracking-widest select-none pointer-events-none z-10 ${isWin ? 'text-[#eab308]' : 'text-red-500'}`}
             style={{ transform: 'rotate(-12deg)', textShadow: `0 0 60px ${isWin ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}`, letterSpacing: '0.15em' }}>
          {isWin ? 'WIN' : 'LOSS'}
        </div>

        {/* LOSS label — right of center card */}
        <div className={`absolute top-[18%] right-[22%] text-8xl font-black tracking-widest select-none pointer-events-none z-10 ${!isWin ? 'text-[#eab308]' : 'text-red-500'}`}
             style={{ transform: 'rotate(12deg)', textShadow: `0 0 60px ${!isWin ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}`, letterSpacing: '0.15em' }}>
          {!isWin ? 'WIN' : 'LOSS'}
        </div>

        {/* ═══ MVP — Top Left of center ═══ */}
        {mvp && (
          <div className="absolute z-20" style={{ top: '12%', left: '8%' }}>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-cover bg-top border-3 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.4)] shrink-0"
                   style={{ backgroundImage: `url('${getPlayerImage(mvp.player)}')`, borderWidth: '3px' }} />
              <div className="pt-1">
                <div className="text-[11px] font-black text-yellow-400 tracking-[0.2em] mb-1">👑 MVP</div>
                <div className="text-white font-bold text-sm">{mvp.player.name}</div>
                <div className="flex gap-3 mt-1.5 text-xs font-black">
                  <span className="text-yellow-400">PTS {mvp.stats.PTS}</span>
                  <span className="text-gray-300">AST {mvp.stats.AST}</span>
                  <span className="text-gray-300">REB {mvp.stats.REB}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCORING LEADER — Left Center ═══ */}
        <div className="absolute z-20" style={{ top: '40%', left: '8%' }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-cover bg-top border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] shrink-0"
                 style={{ backgroundImage: `url('${getPlayerImage(scoringLeader.p)}')` }} />
            <div>
              <div className="text-[9px] font-black text-orange-400 tracking-[0.2em]">SCORING LEADER</div>
              <div className="text-white font-bold text-xs mt-0.5">{scoringLeader.p.name}</div>
              <div className="text-orange-400 text-sm font-black mt-0.5">PTS {scoringLeader.s.PTS}</div>
            </div>
          </div>
        </div>

        {/* ═══ REBOUND LEADER — Bottom Left ═══ */}
        <div className="absolute z-20" style={{ bottom: '22%', left: '8%' }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-cover bg-top border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0"
                 style={{ backgroundImage: `url('${getPlayerImage(reboundLeader.p)}')` }} />
            <div>
              <div className="text-[9px] font-black text-cyan-400 tracking-[0.2em]">REBOUND LEADER</div>
              <div className="text-white font-bold text-xs mt-0.5">{reboundLeader.p.name}</div>
              <div className="text-cyan-400 text-sm font-black mt-0.5">REB {reboundLeader.s.REB}</div>
            </div>
          </div>
        </div>

        {/* ═══ ASSIST LEADER — Bottom Center-Left ═══ */}
        <div className="absolute z-20" style={{ bottom: '8%', left: '8%' }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-cover bg-top border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] shrink-0"
                 style={{ backgroundImage: `url('${getPlayerImage(assistLeader.p)}')` }} />
            <div>
              <div className="text-[9px] font-black text-green-400 tracking-[0.2em]">ASSIST LEADER</div>
              <div className="text-white font-bold text-xs mt-0.5">{assistLeader.p.name}</div>
              <div className="text-green-400 text-sm font-black mt-0.5">AST {assistLeader.s.AST}</div>
            </div>
          </div>
        </div>

        {/* ═══ REWARDS PANEL — Right Side of Center ═══ */}
        <div className="absolute z-20 w-[380px] p-6 bg-[#0c1825]/90 backdrop-blur-[15px] border-2 border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col gap-4"
             style={{ top: '12%', right: '8%' }}>
          <div className="text-[11px] font-black text-cyan-400 tracking-[0.2em] uppercase border-b border-cyan-500/20 pb-2">
            🎁 MATCH REWARDS
          </div>
          
          {/* Cash Reward */}
          <div className="flex items-center justify-between bg-[#112235]/60 border border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <div className="text-xs font-bold text-gray-300">Club Cash</div>
            </div>
            <div className="text-lg font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]">
              +${reward.cash.toLocaleString()}
            </div>
          </div>

          {/* Account EXP */}
          <div className="flex flex-col bg-[#112235]/60 border border-white/5 p-3 rounded-xl gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <div className="text-xs font-bold text-gray-300">Account Experience</div>
              </div>
              <div className="text-sm font-black text-cyan-400">
                +{reward.exp} EXP
              </div>
            </div>
          </div>

          {/* Material Drops */}
          {reward.materials && reward.materials.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[9px] font-black text-gray-400 tracking-[0.1em] uppercase">LOOT SECURED</div>
              <div className="grid grid-cols-2 gap-2">
                {reward.materials.map((mat) => {
                  const isUpgrade = mat.id === 'mat_upgrade';
                  const isSkillTape = mat.id === 'skill_tape';
                  const label = isSkillTape ? 'Skill Tape' : isUpgrade ? 'Upgrade Module' : 'Crafting Alloy';
                  const color = isSkillTape
                    ? 'border-red-500/30 bg-red-500/5 text-red-300'
                    : isUpgrade
                      ? 'border-amber-500/30 bg-amber-500/5 text-amber-300'
                      : 'border-slate-500/30 bg-slate-500/5 text-slate-300';
                  return (
                    <div key={mat.id} className={`flex items-center justify-between border p-2.5 rounded-lg ${color}`}>
                      <div className="text-[10px] font-bold truncate max-w-[100px]">{label}</div>
                      <div className="text-xs font-black">x{mat.qty}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategy Mastery Progression */}
          {reward.strategyExpGained && (
            <div className="flex flex-col gap-2 border-t border-cyan-500/20 pt-3 mt-1">
              <div className="text-[9px] font-black text-cyan-400 tracking-[0.15em] uppercase flex items-center gap-1.5">
                🧠 COACHING STRATEGY EXPERIENCE
              </div>
              <div className="flex flex-col gap-2.5">
                {/* Offensive Strategy */}
                <div className="flex flex-col bg-[#0b131e] border border-cyan-500/10 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-white truncate max-w-[180px]">{reward.strategyExpGained.offName}</span>
                    <span className="text-[9px] font-black text-yellow-400">+50 EXP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[8px] font-black text-cyan-500 bg-cyan-950/50 border border-cyan-500/20 px-1 rounded">OFF</div>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: '100%' }}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Defensive Strategy */}
                <div className="flex flex-col bg-[#0b131e] border border-cyan-500/10 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-white truncate max-w-[180px]">{reward.strategyExpGained.defName}</span>
                    <span className="text-[9px] font-black text-yellow-400">+50 EXP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[8px] font-black text-rose-500 bg-rose-950/50 border border-rose-500/20 px-1 rounded">DEF</div>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full" style={{ width: '100%' }}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ CENTER MODAL — Score VS Card ═══ */}
        <div className="relative z-30 flex flex-col items-center">
          {/* Team names header */}
          <div className="flex w-[520px] mb-[-2px] relative z-10">
            <div className="flex-1 bg-[#0c1825]/95 border border-cyan-500/30 rounded-tl-xl px-4 py-2.5 text-center">
              <span className="text-sm font-black text-cyan-400 tracking-widest uppercase">My Team</span>
            </div>
            <div className="flex-1 bg-[#0c1825]/95 border border-red-500/30 rounded-tr-xl px-4 py-2.5 text-center">
              <span className="text-sm font-black text-red-400 tracking-widest uppercase">{aiTeam.name}</span>
            </div>
          </div>

          {/* Score boxes with VS between */}
          <div className="flex w-[520px] relative">
            <div className={`flex-1 py-3 text-center font-black text-3xl ${isWin ? 'bg-cyan-500/15 text-cyan-300' : 'bg-[#141e2e] text-gray-400'} border border-cyan-500/20`}>
              {matchState.userScore}
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-xl font-black text-gray-500 tracking-widest">VS</div>
            <div className={`flex-1 py-3 text-center font-black text-3xl ${!isWin ? 'bg-red-500/15 text-red-300' : 'bg-[#141e2e] text-gray-400'} border border-red-500/20`}>
              {matchState.aiScore}
            </div>
          </div>

          {/* Player images showcase */}
          <div className="relative w-[520px] h-[260px] bg-gradient-to-b from-[#080e1a] via-[#0a1628] to-[#0c1e36] border-x border-gray-700/30 flex overflow-hidden">
            {/* User team top scorer */}
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-44 h-56 bg-cover bg-top rounded-xl border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.25)]"
                   style={{ backgroundImage: `url('${getPlayerImage(userTopScorer?.p)}')` }} />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-[9px] font-bold text-cyan-400 whitespace-nowrap border border-cyan-500/30">
                {userTopScorer?.p.name} — {userTopScorer?.pts} PTS
              </div>
            </div>

            {/* AI team top scorer */}
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-44 h-56 bg-cover bg-top rounded-xl border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                   style={{ backgroundImage: `url('${getPlayerImage(aiTopScorer?.p)}')` }} />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-[9px] font-bold text-red-400 whitespace-nowrap border border-red-500/30">
                {aiTopScorer?.p.name} — {aiTopScorer?.pts} PTS
              </div>
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="flex w-[520px] gap-0">
            <button onClick={handleReturn}
                    className="flex-1 py-3 bg-[#1a2332] border border-gray-600 rounded-bl-xl text-white font-black text-sm tracking-widest hover:bg-[#243347] transition-colors cursor-pointer uppercase">
              Close
            </button>
            <button onClick={() => setShowPostStats(!showPostStats)}
                    className="flex-1 py-3 bg-[#1a2332] border border-gray-600 rounded-br-xl text-cyan-400 font-black text-sm tracking-widest hover:bg-[#243347] transition-colors cursor-pointer uppercase">
              Statistics
            </button>
          </div>
        </div>

        {/* Statistics Sub-Modal (toggled by button) */}
        {showPostStats && (
          <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center overflow-y-auto p-6">
            <div className="w-full max-w-3xl bg-[#121c29]/95 border-2 border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-white tracking-widest">MATCH STATISTICS</h3>
                <button onClick={() => setShowPostStats(false)} className="text-gray-400 hover:text-white text-2xl font-bold cursor-pointer">×</button>
              </div>
              <BoxScoreTable players={allUserPlayers} label="MY TEAM" color="text-cyan-400" />
              <div className="border-t border-gray-700 my-3" />
              <BoxScoreTable players={aiTeam.roster} label={aiTeam.name.toUpperCase()} color="text-red-400" />
              {/* Quarter breakdown */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-[11px] text-center whitespace-nowrap">
                  <thead><tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left px-2 py-1 min-w-[100px]"></th>
                    {[1,2,3,4].map(q => <th key={q} className="px-2 w-12">Q{q}</th>)}
                    {matchState.otScores.user.map((_, i) => <th key={`ot${i}`} className="px-2 w-12 text-yellow-500 font-black">{i === 0 ? 'OT' : `${i+1}OT`}</th>)}
                    <th className="px-2 font-black w-16">FINAL</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="text-left px-2 py-1 text-cyan-400 font-bold">MY TEAM</td>
                      {qs.user.map((s, i) => <td key={i} className={`px-2 font-bold ${s > qs.ai[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                      {matchState.otScores.user.map((s, i) => <td key={`otu${i}`} className={`px-2 font-bold ${s > matchState.otScores.ai[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                      <td className="px-2 font-black text-cyan-400">{matchState.userScore}</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="text-left px-2 py-1 text-red-400 font-bold">{aiTeam.name.toUpperCase()}</td>
                      {qs.ai.map((s, i) => <td key={i} className={`px-2 font-bold ${s > qs.user[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                      {matchState.otScores.ai.map((s, i) => <td key={`ota${i}`} className={`px-2 font-bold ${s > matchState.otScores.user[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                      <td className="px-2 font-black text-red-400">{matchState.aiScore}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowPostStats(false)} className="flex-1 py-2 rounded-xl font-black bg-gray-700 text-white hover:bg-gray-600 transition-all cursor-pointer uppercase tracking-widest text-sm">Back</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LOBBY / SEASON_MAP VIEW
  if (viewState === 'SEASON_MAP') {
    return (
      <SeasonMap 
        onStartMatch={(diff) => startMatch(diff)} 
        onBack={() => router.push('/')} 
      />
    );
  }

  // Fallback (should never be reached)
  return null;
}
