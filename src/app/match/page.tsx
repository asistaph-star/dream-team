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
import { PreMatchScreen } from "@/features/match/components/PreMatchScreen";
import { EnergyDrinkModal } from "@/features/match/components/EnergyDrinkModal";
import { StrategyModal } from "@/features/match/components/StrategyModal";
import { PostGameScreen } from "@/features/match/components/PostGameScreen";
import { MatchBottomHUD } from "@/features/match/components/MatchBottomHUD";
import { MatchActionBar } from "@/features/match/components/MatchActionBar";
import { getMatchStyles } from "@/features/match/styles/getMatchStyles";





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

  const matchStyles = getMatchStyles(matchScale);

  if (viewState === 'PRE_MATCH') {
    const preIsHome = matchState.isHomeGame;
    const preAiTeam = mockAiTeams[selectedDifficulty];
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
