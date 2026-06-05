"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGameState, MatchResult } from "@/lib/context/GameStateContext";
import { mockMaterials } from "@/lib/data/mockItems";
import { getTierRating, getTierColor } from "@/lib/data/mockPlayers";
import { Player } from "@/lib/types/player";
import { mockAiTeams, Difficulty, MatchState, MatchEvent, PlayerMatchStats, createInitialMatchState, simulateTick, computeTeamScore, computeEffective, avgStamina, getStaminaMod, getPlayerMaxStamina, getStaminaPercent, OFFENSIVE_STRATEGIES, DEFENSIVE_STRATEGIES, emptyStats, generatePreMatchInjuries, calibrateLineupForInjuries } from "@/lib/utils/matchEngine";
import { PlayerCard } from "@/components/player/PlayerCard";
import { SeasonMap } from "@/components/season/SeasonMap";
import { ViewState } from "@/features/match/types";
import { MATCH_STAMINA_UI_CONFIG, SLOT_POSITIONS, MATCH_PLAYBACK_SPEED } from "@/features/match/constants/matchConfig";
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
import { PreMatchScreen } from "@/features/match/components/PreMatchScreen";
import { EnergyDrinkModal } from "@/features/match/components/EnergyDrinkModal";
import { StrategyModal } from "@/features/match/components/StrategyModal";
import { PostGameScreen } from "@/features/match/components/PostGameScreen";
import { MatchBottomHUD } from "@/features/match/components/MatchBottomHUD";
import { MatchActionBar } from "@/features/match/components/MatchActionBar";
import { ShootoutOverlay } from "@/features/match/components/ShootoutOverlay";
import { MatchScoreboard } from "@/features/match/components/MatchScoreboard";
import { OvertimeTransitionOverlay } from "@/features/match/components/OvertimeTransitionOverlay";
import { MatchExitButton } from "@/features/match/components/MatchExitButton";
import { BlockAnimationDevToggle } from "@/features/match/components/BlockAnimationDevToggle";
import { getMatchStyles } from "@/features/match/styles/getMatchStyles";





export default function MatchPage() {
  const router = useRouter();
  const { finishMatch, activeLineup, activeReserves, roster, teamOffense, teamDefense, strategyLevels } = useGameState();
  const matchRoster = useMemo(() => [...activeLineup, ...activeReserves], [activeLineup, activeReserves]);
  const injuredStarters = activeLineup.filter(p => p.isInjured);
  const hasInjuredStarters = injuredStarters.length > 0;

  const [viewState, setViewState] = useState<ViewState>('SEASON_MAP');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  const [opponentName, setOpponentName] = useState<string>('');
  
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

  const aiTeam = useMemo(() => {
    const baseTeam = mockAiTeams[selectedDifficulty];
    return {
      ...baseTeam,
      name: opponentName || baseTeam.name
    };
  }, [selectedDifficulty, opponentName]);

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

    const duration = 1200 / MATCH_PLAYBACK_SPEED; // animate over 1.2s of the 1.5s interval scaled by speed
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


  const startMatch = useCallback((diff: Difficulty, customName?: string) => {
    setSelectedDifficulty(diff);
    const actualOpponentName = customName || mockAiTeams[diff].name;
    setOpponentName(actualOpponentName);

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
  }, [roster, activeLineup, matchRoster, strategyLevels]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (viewState === 'SIMULATING' && !matchState.isFinished && !isPaused && !matchState.ftSequence && !showOTTransition && !matchState.shootoutSequence && !matchState.activeShotMeter) {
      interval = setInterval(() => {
        setMatchState(prev => {
          const ai = aiTeam;
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
      }, 1500 / MATCH_PLAYBACK_SPEED); 
    }
    return () => clearInterval(interval);
  }, [viewState, matchState.isFinished, aiTeam, teamOffense, teamDefense, currentLineup, matchRoster, isPaused, matchState.ftSequence, matchState.activeShotMeter]);

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

  const matchStyles = getMatchStyles(matchScale);

  if (viewState === 'PRE_MATCH') {
    const preIsHome = matchState.isHomeGame;
    const preAiTeam = aiTeam;
    // PRE_MATCH should show the starting lineup, not the full roster
    const userPlayers = liveLineup.length > 0 ? liveLineup : activeLineup;
    const aiPlayers = matchState.aiLineupIds.map(id => preAiTeam.roster.find(p => p.id === id)).filter(Boolean) as Player[];
    return (
      <PreMatchScreen
        preIsHome={preIsHome}
        preAiTeam={preAiTeam}
        userPlayers={userPlayers}
        aiPlayers={aiPlayers}
        setViewState={setViewState}
      />
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
            <BlockAnimationDevToggle 
              blockAnimationType={blockAnimationType} 
              setBlockAnimationType={setBlockAnimationType} 
            />
            {/* TOP HUD */}
            <MatchScoreboard
              matchState={matchState}
              viewState={viewState}
              currentLineup={currentLineup}
              aiTeam={aiTeam}
              teamOffense={teamOffense}
              teamDefense={teamDefense}
              displayUserScore={displayUserScore}
              displayAiScore={displayAiScore}
              displayClock={displayClock}
              displayPossClock={displayPossClock}
              halftimeCountdown={halftimeCountdown}
              draggingPlayerId={draggingPlayerId}
              dragHoverSlotId={dragHoverSlotId}
              selectedDifficulty={selectedDifficulty}
              isClutchActive={isClutchActive}
              isClutchHigh={isClutchHigh}
              isHomeGame={isHomeGame}
              uiRallyMode={uiRallyMode}
              userMomPct={userMomPct}
            />

            {/* EXIT BUTTON */}
            <MatchExitButton onExit={handleReturn} />

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
            <OvertimeTransitionOverlay show={showOTTransition} quarter={matchState.quarter} />

            {/* SHOOTOUT OVERLAY */}
            <ShootoutOverlay
              shootoutSequence={matchState.shootoutSequence}
              shootoutRevealCount={shootoutRevealCount}
              aiTeamName={aiTeam.name}
            />

            {/* BOTTOM HUD CONTAINER (Groups Chat, Logs, and Actions tightly) */}
            <div className="absolute bottom-6 left-6 right-6 z-50 flex gap-3 items-end xl:justify-center">
                
                <MatchBottomHUD
                  activeLogTab={activeLogTab}
                  setActiveLogTab={setActiveLogTab}
                  statsTeam={statsTeam}
                  setStatsTeam={setStatsTeam}
                  statsFilter={statsFilter}
                  setStatsFilter={setStatsFilter}
                  displayEvents={displayEvents}
                  matchState={matchState}
                  currentLineup={currentLineup}
                  aiTeam={aiTeam}
                  getDisplayStats={getDisplayStats}
                  logEndRef={logEndRef}
                  roster={roster}
                  userOffStrategy={matchState.userOffStrategy}
                  userDefStrategy={matchState.userDefStrategy}
                />
                
                {/* BOTTOM HUD - ACTION BAR Container */}
                <div className="flex gap-2 items-end shrink-0">
                    <MatchActionBar
                      openModal={openModal}
                      handleTimeout={handleTimeout}
                      handleMomentum={handleMomentum}
                      matchState={matchState}
                      timeoutCountdown={timeoutCountdown}
                      momentumTimer={0}
                      subCooldownEnd={subCooldownEnd}
                      cooldownNow={cooldownNow}
                    />
                </div>
            </div>


            {/* ENERGY DRINK MODAL */}
            <EnergyDrinkModal
              show={showEnergyDrinkModal}
              onClose={closeModal}
              currentLineup={currentLineup}
              energyDrinkPick={energyDrinkPick}
              setEnergyDrinkPick={setEnergyDrinkPick}
              onConfirm={handleEnergyDrinkConfirm}
              matchState={matchState}
              getPlayerMaxStamina={getPlayerMaxStamina}
              getStaminaPercent={getStaminaPercent}
            />

            {/* STRATEGY MODAL */}
            <StrategyModal
              show={showStrategyModal}
              onClose={closeModal}
              matchState={matchState}
              offCooldownEnd={offCooldownEnd}
              defCooldownEnd={defCooldownEnd}
              cooldownNow={cooldownNow}
              onOffStrategyChange={handleOffStrategyChange}
              onDefStrategyChange={handleDefStrategyChange}
              offensiveStrategies={OFFENSIVE_STRATEGIES}
              defensiveStrategies={DEFENSIVE_STRATEGIES}
            />

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

  // POST GAME VIEW
  if (viewState === 'POST_GAME' && reward) {
    return (
      <PostGameScreen
        reward={reward}
        matchState={matchState}
        aiTeam={aiTeam}
        matchRoster={matchRoster}
        showPostStats={showPostStats}
        setShowPostStats={setShowPostStats}
        handleReturn={handleReturn}
        getDisplayStats={getDisplayStats}
      />
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
