import { useState, useEffect, useRef } from "react";
import { Award, Trophy, Timer, Flame, ArrowRight, CornerDownRight, ShieldAlert, Sparkles, AlertCircle, Play } from "lucide-react";
import { Formation, DraftSlot, Player, SimulatedMatch, MatchEvent } from "../types";
import { getRandomOpponents, simulateMatchPlay } from "../utils/simulator";
import { LEGENDARY_MANAGERS } from "../data/managers";
import { playGoalCheer, playWhistle } from "../utils/audio";

interface SimulationViewProps {
  formation: Formation;
  slots: DraftSlot[];
  playerName: string;
  managerId?: string;
  onSimulationComplete: (matches: SimulatedMatch[], wonTournament: boolean) => void;
}

interface BracketMatch {
  id: string;
  stage: "Oitavas" | "Quartas" | "Semifinal" | "Final";
  home: { name: string; overall: number; attack: number; midfield: number; defense: number; chemistry: number; manager: string; players?: Player[] };
  away: { name: string; overall: number; attack: number; midfield: number; defense: number; chemistry: number; manager: string; players?: Player[] };
  simulatedMatch?: SimulatedMatch;
  winnerName?: string;
}

export default function SimulationView({ formation, slots, playerName, managerId, onSimulationComplete }: SimulationViewProps) {
  // 1. Core State
  const [bracketState, setBracketState] = useState<{
    Oitavas: BracketMatch[];
    Quartas: BracketMatch[];
    Semifinal: BracketMatch[];
    Final: BracketMatch[];
  }>({
    Oitavas: [],
    Quartas: [],
    Semifinal: [],
    Final: []
  });

  const [currentStage, setCurrentStage] = useState<"Oitavas" | "Quartas" | "Semifinal" | "Final">("Oitavas");
  const [simulationHistory, setSimulationHistory] = useState<SimulatedMatch[]>([]);
  const [userSurvival, setUserSurvival] = useState<boolean>(true);
  const [userInAction, setUserInAction] = useState<boolean>(false);
  
  // Find chosen manager details if present
  const activeManager = LEGENDARY_MANAGERS.find(m => m.id === managerId);
  // starts at 1, gains +1 on surviving each round. Sir Alex Ferguson/Zidane start with a slight extra decision boost!
  const initialMomentum = activeManager && activeManager.boostType === "clutch" ? 2 : 1;
  const [momentum, setMomentum] = useState<number>(initialMomentum); 

  // Live ticker simulation state
  const [activeLiveMatch, setActiveLiveMatch] = useState<SimulatedMatch | null>(null);
  const [activeLiveMinute, setActiveLiveMinute] = useState<number>(0);
  const [activeLiveEvents, setActiveLiveEvents] = useState<MatchEvent[]>([]);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const allMatchesRef = useRef<SimulatedMatch[]>([]);

  // Compute Base values
  const baseOvr = slots.some(s => s.draftedPlayer !== null) ? Math.round(slots.reduce((sum, s) => sum + (s.draftedPlayer?.overall || 0), 0) / slots.length) : 80;
  const baseAttack = slots.some(s => s.draftedPlayer !== null) ? Math.round(slots.filter(s => ["ST", "RW", "LW"].includes(s.position)).reduce((sum, s) => sum + (s.draftedPlayer?.overall || 0), 0) / Math.max(1, slots.filter(s => ["ST", "RW", "LW"].includes(s.position)).length)) : 80;
  const baseMidfield = slots.some(s => s.draftedPlayer !== null) ? Math.round(slots.filter(s => ["CM", "CDM", "CAM", "LM", "RM"].includes(s.position)).reduce((sum, s) => sum + (s.draftedPlayer?.overall || 0), 0) / Math.max(1, slots.filter(s => ["CM", "CDM", "CAM", "LM", "RM"].includes(s.position)).length)) : 80;
  const baseDefense = slots.some(s => s.draftedPlayer !== null) ? Math.round(slots.filter(s => ["CB", "LB", "RB", "GK"].includes(s.position)).reduce((sum, s) => sum + (s.draftedPlayer?.overall || 0), 0) / Math.max(1, slots.filter(s => ["CB", "LB", "RB", "GK"].includes(s.position)).length)) : 80;

  let boostedOvr = baseOvr;
  let boostedAttack = baseAttack;
  let boostedMidfield = baseMidfield;
  let boostedDefense = baseDefense;
  let managerChemBoost = 0;

  if (activeManager) {
    if (activeManager.boostType === "midfield") boostedMidfield += 3;
    if (activeManager.boostType === "attack") boostedAttack += 3;
    if (activeManager.boostType === "defense") boostedDefense += 3;
    if (activeManager.boostType === "chemistry") managerChemBoost = 5;
    if (activeManager.boostType === "clutch") {
      boostedOvr = Math.round(baseOvr + 1.5);
      boostedAttack = Math.round(baseAttack + 1.5);
      boostedMidfield = Math.round(baseMidfield + 1.5);
      boostedDefense = Math.round(baseDefense + 1.5);
    }
  }

  // User team package
  const userTeamObj = {
    name: `Legacy FC (${playerName})`,
    overall: boostedOvr,
    attack: boostedAttack,
    midfield: boostedMidfield,
    defense: boostedDefense,
    chemistry: 80, // will compute below
    lineup: slots.map(s => s.draftedPlayer?.name || "Jogador"),
    players: slots.map(s => s.draftedPlayer).filter((p): p is Player => p !== null),
    manager: playerName
  };

  // Re-run metrics to get exact OVR/Chemistry
  useEffect(() => {
    const players = slots.map(s => s.draftedPlayer).filter((p): p is Player => p !== null);
    if (players.length > 0) {
      // Calculate chemistry based on connections
      let chem = 40;
      const clubCounts: { [key: string]: number } = {};
      const seasonCounts: { [key: string]: number } = {};

      players.forEach(p => {
        p.clubs.forEach(c => { clubCounts[c] = (clubCounts[c] || 0) + 1; });
        seasonCounts[p.year] = (seasonCounts[p.year] || 0) + 1;
      });

      Object.values(clubCounts).forEach(count => { if (count > 1) chem += (count - 1) * 8; });
      Object.values(seasonCounts).forEach(count => { if (count > 1) chem += (count - 1) * 10; });
      userTeamObj.chemistry = Math.max(10, Math.min(100, chem + managerChemBoost));
    }

    // Set up initial Round of 16 matchups (User + 15 Opponents)
    const opponents = getRandomOpponents(15);
    
    // User places in first slot! Other matchups paired randomly
    const oitavasMatches: BracketMatch[] = [
      {
        id: "m_oit_1",
        stage: "Oitavas",
        home: userTeamObj,
        away: opponents[0]
      },
      ...Array.from({ length: 7 }).map((_, i) => ({
        id: `m_oit_${i + 2}`,
        stage: "Oitavas" as const,
        home: opponents[2 * i + 1],
        away: opponents[2 * i + 2]
      }))
    ];

    setBracketState({
      Oitavas: oitavasMatches,
      Quartas: [],
      Semifinal: [],
      Final: []
    });
  }, []);

  // 2. Play active ticker timer
  const runLiveTicker = (userMatch: SimulatedMatch, callbackOnClose: () => void) => {
    setActiveLiveMatch(userMatch);
    setActiveLiveMinute(0);
    setActiveLiveEvents([]);
    setUserInAction(true);

    if (tickerIntervalRef.current) clearInterval(tickerIntervalRef.current);

    let minute = 0;
    // Keep track of goals within live loop to trigger cheering sounds precisely
    let goalsHeardCount = 0;

    tickerIntervalRef.current = setInterval(() => {
      minute += 2;
      
      if (minute > 120 && userMatch.homePenalties !== undefined) {
        // Collect penalty shootouts on rapid ticker
        const shooterEvents = userMatch.events.filter(e => e.type === "shootout" || e.type === "penalty");
        setActiveLiveEvents(prev => {
          const shooterMinutes = prev.map(pe => pe.minute);
          const nextShooters = shooterEvents.filter(e => !shooterMinutes.includes(e.minute));
          
          // Trigger a goal cheer if one of the newly added shooters succeeded
          const hasNewSuccess = nextShooters.some(e => e.type === "goal" || e.description.includes("GOL") || e.description.includes("converte") || e.description.includes("aço"));
          if (hasNewSuccess) {
            playGoalCheer();
          }

          return [...prev, ...nextShooters];
        });
        
        if (minute >= 130) {
          clearInterval(tickerIntervalRef.current!);
          playWhistle();
          setUserInAction(false);
          callbackOnClose();
        }
      } else if (minute > 90 && userMatch.homePenalties === undefined) {
        // Safe standard Match finish (no extra time)
        clearInterval(tickerIntervalRef.current!);
        playWhistle();
        setUserInAction(false);
        callbackOnClose();
      } else {
        // Append events chronologically corresponding to this minute
        const nextEvents = userMatch.events.filter(e => e.minute <= minute && e.type !== "shootout" && e.type !== "penalty");
        
        // Count goals in the upcoming set of events
        const newGoalsCount = nextEvents.filter(e => e.type === "goal").length;
        if (newGoalsCount > goalsHeardCount) {
          playGoalCheer();
          goalsHeardCount = newGoalsCount;
        }

        setActiveLiveEvents(nextEvents);
        setActiveLiveMinute(minute);
      }
    }, 50); // Fast butter-smooth velocity ticker
  };

  // Skip or conclude active ticker rapidly
  const skipActiveTicker = () => {
    if (tickerIntervalRef.current && activeLiveMatch) {
      clearInterval(tickerIntervalRef.current);
      playWhistle();
      setActiveLiveEvents(activeLiveMatch.events);
      setActiveLiveMinute(activeLiveMatch.homePenalties !== undefined ? 120 : 90);
      setUserInAction(false);
    }
  };

  // 3. Main Stage Simulation Trigger
  const simulateActiveStage = () => {
    const stageMatches = bracketState[currentStage];
    if (stageMatches.length === 0) return;

    const userMatch = stageMatches.find(m => m.home.name.includes(playerName) || m.away.name.includes(playerName));
    const simulatedTourList: SimulatedMatch[] = [];

    // Save outputs
    const updatedMatches = stageMatches.map(m => {
      const isUserMatch = m.home.name.includes(playerName) || m.away.name.includes(playerName);
      let simResult: SimulatedMatch;

      if (isUserMatch) {
        simResult = simulateMatchPlay(
          currentStage,
          m.home.name.includes(playerName) ? m.home as any : m.away as any,
          m.home.name.includes(playerName) ? m.away : m.home,
          momentum
        );
      } else {
        // Standard quick simulation of opponent games
        simResult = simulateMatchPlay(
          currentStage,
          m.home as any,
          m.away,
          0
        );
      }

      simulatedTourList.push(simResult);

      return {
        ...m,
        simulatedMatch: simResult,
        winnerName: simResult.winner
      };
    });

    // Save simulation list to cache
    setSimulationHistory(prev => {
      const updated = [...prev, ...simulatedTourList];
      allMatchesRef.current = updated;
      return updated;
    });

    // Update bracket matches for this stage
    setBracketState(prev => ({
      ...prev,
      [currentStage]: updatedMatches
    }));

    // Check if user survived
    const userSimMatch = simulatedTourList.find(m => m.homeTeam.includes(playerName) || m.awayTeam.includes(playerName));
    const userWon = userSimMatch ? userSimMatch.winner.includes(playerName) : false;

    // Trigger visual live ticket presentation if user is inside
    if (userSimMatch) {
      runLiveTicker(userSimMatch, () => {
        postStageResolve(updatedMatches, userWon, simulatedTourList);
      });
    } else {
      // User already eliminated, resolve instantly
      postStageResolve(updatedMatches, false, simulatedTourList);
    }
  };

  const postStageResolve = (completedMatches: BracketMatch[], userWon: boolean, latestSims: SimulatedMatch[]) => {
    setUserSurvival(userWon);
    
    // Prepare next stage matches
    let winners = completedMatches.map(m => {
      // Find matching legacy team object or opponent object
      return m.winnerName === m.home.name ? m.home : m.away;
    });

    let tempBracketState = { ...bracketState, [currentStage]: completedMatches };
    let tempHistory = [...allMatchesRef.current];

    if (userWon) {
      if (currentStage === "Oitavas") {
        // Build Quartas Matchups (8 survivors -> 4 matches)
        const quartasMatches: BracketMatch[] = Array.from({ length: 4 }).map((_, i) => ({
          id: `m_qua_${i + 1}`,
          stage: "Quartas",
          home: winners[2 * i],
          away: winners[2 * i + 1]
        }));

        setBracketState(prev => ({ ...prev, Quartas: quartasMatches }));
      } else if (currentStage === "Quartas") {
        // Build Semifinal Matchups (4 survivors -> 2 matches)
        const semisMatches: BracketMatch[] = Array.from({ length: 2 }).map((_, i) => ({
          id: `m_sem_${i + 1}`,
          stage: "Semifinal",
          home: winners[2 * i],
          away: winners[2 * i + 1]
        }));

        setBracketState(prev => ({ ...prev, Semifinal: semisMatches }));
      } else if (currentStage === "Semifinal") {
        // Build Final Matchup (2 survivors -> 1 match)
        const finalMatch: BracketMatch[] = [{
          id: "m_fin_1",
          stage: "Final",
          home: winners[0],
          away: winners[1]
        }];

        setBracketState(prev => ({ ...prev, Final: finalMatch }));
      }

      setMomentum(prev => Math.min(5, prev + 1)); // bonus momentum to user
    } else {
      // User is eliminated! Auto simulate all subsequent stages count-down in one shot
      let stageToSim: "Oitavas" | "Quartas" | "Semifinal" | "Final" = currentStage;
      
      while (stageToSim !== "Final") {
        if (stageToSim === "Oitavas") {
          // Build Quartas
          const quartasMatches: BracketMatch[] = Array.from({ length: 4 }).map((_, i) => ({
            id: `m_qua_${i + 1}`,
            stage: "Quartas",
            home: winners[2 * i],
            away: winners[2 * i + 1]
          }));
          const simulatedQuartas = quartasMatches.map(m => {
            const simResult = simulateMatchPlay("Quartas", m.home as any, m.away as any, 0);
            tempHistory.push(simResult);
            return {
              ...m,
              simulatedMatch: simResult,
              winnerName: simResult.winner
            };
          });
          tempBracketState.Quartas = simulatedQuartas;
          winners = simulatedQuartas.map(m => m.winnerName === m.home.name ? m.home : m.away);
          stageToSim = "Quartas";
        } else if (stageToSim === "Quartas") {
          // Build Semis
          const semisMatches: BracketMatch[] = Array.from({ length: 2 }).map((_, i) => ({
            id: `m_sem_${i + 1}`,
            stage: "Semifinal",
            home: winners[2 * i],
            away: winners[2 * i + 1]
          }));
          const simulatedSemis = semisMatches.map(m => {
            const simResult = simulateMatchPlay("Semifinal", m.home as any, m.away as any, 0);
            tempHistory.push(simResult);
            return {
              ...m,
              simulatedMatch: simResult,
              winnerName: simResult.winner
            };
          });
          tempBracketState.Semifinal = simulatedSemis;
          winners = simulatedSemis.map(m => m.winnerName === m.home.name ? m.home : m.away);
          stageToSim = "Semifinal";
        } else if (stageToSim === "Semifinal") {
          // Build Final
          const finalMatch: BracketMatch[] = [{
            id: "m_fin_1",
            stage: "Final",
            home: winners[0],
            away: winners[1]
          }];
          const simulatedFinal = finalMatch.map(m => {
            const simResult = simulateMatchPlay("Final", m.home as any, m.away as any, 0);
            tempHistory.push(simResult);
            return {
              ...m,
              simulatedMatch: simResult,
              winnerName: simResult.winner
            };
          });
          tempBracketState.Final = simulatedFinal;
          winners = simulatedFinal.map(m => m.winnerName === m.home.name ? m.home : m.away);
          stageToSim = "Final";
        }
      }

      setBracketState(tempBracketState);
      setSimulationHistory(tempHistory);
      allMatchesRef.current = tempHistory;
    }
  };

  // Close live window and transition stage tabs
  const handleTransitionNext = () => {
    setActiveLiveMatch(null);
    setActiveLiveEvents([]);

    if (!userSurvival) {
      // User is eliminated! All subsequent stages are simulated automatically already.
      onSimulationComplete(allMatchesRef.current.length > 0 ? allMatchesRef.current : simulationHistory, false);
      return;
    }

    if (currentStage === "Oitavas") {
      setCurrentStage("Quartas");
    } else if (currentStage === "Quartas") {
      setCurrentStage("Semifinal");
    } else if (currentStage === "Semifinal") {
      setCurrentStage("Final");
    } else {
      // Tournament Final completed! Send history up
      const userWonFinal = bracketState.Final[0]?.winnerName?.includes(playerName) || false;
      onSimulationComplete(allMatchesRef.current.length > 0 ? allMatchesRef.current : simulationHistory, userWonFinal);
    }
  };

  // Check if they can simulate next step
  const activeStageMatches = bracketState[currentStage];
  const isStageSimulated = activeStageMatches.length > 0 && activeStageMatches.every(m => m.simulatedMatch !== undefined);

  return (
    <div className="space-y-8 animate-fade-in text-white relative">
      
      {/* 1. STAGE TABS/PROGRESS TRACKER */}
      <div className="bg-[#09090B] border border-[#1F2937] rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-xl">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#D4AF37] animate-pulse" />
          <span className="font-semibold font-display text-sm tracking-wider uppercase text-zinc-100">BRACKETS UEFA</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {(["Oitavas", "Quartas", "Semifinal", "Final"] as const).map((st) => {
            const isActive = currentStage === st;
            const isDone = bracketState[st].every(m => m.simulatedMatch !== undefined) && bracketState[st].length > 0;

            return (
              <span
                key={st}
                className={`px-3 py-1 rounded-lg border transition-all ${
                  isActive 
                    ? "bg-[#D4AF37] text-black border-[#D4AF37] font-bold" 
                    : (isDone ? "bg-zinc-900/50 text-zinc-500 border-[#1F2937]" : "bg-transparent text-zinc-650 border-[#1F2937]")
                }`}
              >
                {st === "Oitavas" ? "Oitavas" : (st === "Quartas" ? "Quartas" : (st === "Semifinal" ? "Semis" : "Final"))}
              </span>
            );
          })}
        </div>
      </div>

      {/* USER TEAM POWER PANEL & TACTICAL MANAGER INFO */}
      {activeManager && (
        <div className="bg-[#1F2937]/30 border border-[#1F2937] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg text-[#D4AF37]">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">TÁTICA LENDÁRIA ATIVA</p>
              <h4 className="font-extrabold text-[#D4AF37] text-sm flex items-center gap-2 mt-0.5">
                {activeManager.name} <span className="text-zinc-400 font-medium font-mono text-xs">({activeManager.specialty})</span>
              </h4>
              <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                {activeManager.desc}
              </p>
            </div>
          </div>

          {/* Attributes breakdown */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#1F2937]/50 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">ATA:</span>
              <span className="text-xs font-black text-white">{userTeamObj.attack}</span>
              {(activeManager.boostType === "attack") && (
                <span className="text-[9px] text-[#D4AF37] font-extrabold">(+3)</span>
              )}
              {activeManager.boostType === "clutch" && (
                <span className="text-[9px] text-[#D4AF37] font-extrabold">(+1)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#1F2937]/50 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">MEI:</span>
              <span className="text-xs font-black text-[#2563EB]">{userTeamObj.midfield}</span>
              {activeManager.boostType === "midfield" && (
                <span className="text-[9px] text-[#2563EB] font-extrabold">(+3)</span>
              )}
              {activeManager.boostType === "clutch" && (
                <span className="text-[9px] text-[#D4AF37] font-extrabold">(+1)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#1F2937]/50 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">DEF:</span>
              <span className="text-xs font-black text-zinc-400">{userTeamObj.defense}</span>
              {activeManager.boostType === "defense" && (
                <span className="text-[9px] text-green-500 font-extrabold">(+3)</span>
              )}
              {activeManager.boostType === "clutch" && (
                <span className="text-[9px] text-[#D4AF37] font-extrabold">(+1)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#1F2937]/50 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">ENTR.:</span>
              <span className="text-xs font-black text-white">{Math.min(100, userTeamObj.chemistry)}%</span>
              {activeManager.boostType === "chemistry" && (
                <span className="text-[9px] text-[#D4AF37] font-extrabold">(+5)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 border border-[#D4AF37]/20 px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/5">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase">DECISÃO:</span>
              <span className="text-xs font-black text-[#D4AF37]">{momentum}</span>
              {activeManager.boostType === "clutch" && (
                <span className="text-[9px] text-[#D4AF37] font-extrabold">(MIST.)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MATCH DISPLAY FEED ROW OR BRACKETS BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeStageMatches.map((match) => {
          const isUserMatch = match.home.name.includes(playerName) || match.away.name.includes(playerName);
          const hasResult = match.simulatedMatch !== undefined;
          const winner = match.winnerName;

          return (
            <div
              key={match.id}
              className={`p-4 bg-zinc-950/40 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                isUserMatch 
                  ? "border-[#D4AF37] shadow-lg shadow-[#D4AF37]/5 bg-[#09090B]/80" 
                  : "border-[#1F2937] hover:border-[#1F2937]/80"
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pb-1 border-b border-[#1F2937]">
                <span>{match.stage} - {isUserMatch ? "Seu Jogo" : "Simulado"}</span>
                {hasResult && <span className="text-[#D4AF37] font-bold">FIM</span>}
              </div>

              {/* Home & Away Teams Box */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-1 rounded">
                  <span className={`text-xs font-semibold truncate max-w-[130px] ${winner === match.home.name ? "text-[#D4AF37] font-bold" : "text-zinc-300"}`}>
                    {match.home.name.replace(`Legacy FC (${playerName})`, "Você")}
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {hasResult ? match.simulatedMatch?.homeScore : "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-1 rounded">
                  <span className={`text-xs font-semibold truncate max-w-[130px] ${winner === match.away.name ? "text-[#D4AF37] font-bold" : "text-zinc-300"}`}>
                    {match.away.name.replace(`Legacy FC (${playerName})`, "Você")}
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {hasResult ? match.simulatedMatch?.awayScore : "-"}
                  </span>
                </div>

                {/* Show shootout results if any */}
                {hasResult && match.simulatedMatch?.homePenalties !== undefined && (
                  <span className="text-[10px] text-zinc-500 block text-right font-mono">
                    Pênaltis: {match.simulatedMatch.homePenalties} - {match.simulatedMatch.awayPenalties}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. SIMULATION CONTROLS BAR */}
      <div className="bg-zinc-950/30 border border-[#1F2937] w-full p-6 text-center rounded-2xl space-y-4 shadow-xl">
        {!isStageSimulated ? (
          <div className="space-y-4 max-w-sm mx-auto">
            <h4 className="font-bold text-base font-display text-white tracking-tight">Tudo pronto para as {currentStage}!</h4>
            <p className="text-xs text-zinc-400">
              O momento exige atenção absoluta. Seus atacantes farão valer seu rating para furar defesas de calibre da Champions.
            </p>
            <button
              id="simulate-stage-btn"
              onClick={simulateActiveStage}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#D4AF37] to-[#B08F26] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-bold text-sm rounded-xl shadow-lg active:scale-95 transition-all text-center uppercase tracking-wider cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              Simular Jogos
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-[#D4AF37] text-[10px] font-bold tracking-wider uppercase">
              Etapa Concluída
            </div>
            
            {userInAction ? (
              <p className="text-xs text-zinc-400 animate-pulse font-mono">
                Simulador ativado... Assistindo desdobramentos de perto.
              </p>
            ) : userSurvival ? (
              <div className="space-y-3">
                <h4 className="font-bold text-base text-[#D4AF37]">VITÓRIA! Você segue firme rumo à taça!</h4>
                <p className="text-xs text-zinc-400">Excelente performance do seu onze. Avance para o próximo escalão de oponentes.</p>
                <button
                  onClick={handleTransitionNext}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer transition-all shadow-md"
                >
                  Continuar Campanha <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-[#09090B] border border-[#1F2937] p-5 rounded-2xl space-y-3">
                <h4 className="font-bold text-base text-zinc-300">Eliminado! Fim do Sonho da UCL</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sua equipe de lendas vendeu caro a derrota nas {currentStage}, mas acabou tombando por falta de consistência defensiva ou revés nos pênaltis.
                </p>
                <button
                  onClick={handleTransitionNext}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-[#1F2937] hover:border-[#D4AF37]/50 text-white font-mono text-xs rounded-xl cursor-pointer transition-all"
                >
                  Ver fim do torneio & Gerar crônica <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. MODAL DETALHE DO JOGO EM TEMPO REAL */}
      {activeLiveMatch && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#09090B] border border-[#D4AF37]/40 rounded-2xl p-6 text-center max-w-xl w-full relative space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Header section with live scoreboard */}
            <div className="space-y-2 border-b border-[#1F2937] pb-4">
              <span className="bg-red-600/10 text-red-500 border border-red-500/20 font-mono text-[10px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 leading-none uppercase">
                <Timer className="w-3.5 h-3.5 animate-spin" /> LIVE
              </span>
              <p className="text-xs text-zinc-500 font-mono">Etapa: {activeLiveMatch.stage}</p>

              {/* Match Scorers Title */}
              <div className="flex justify-between items-center max-w-sm mx-auto pt-2 gap-4">
                <div className="text-left w-2/5">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                    {activeLiveMatch.homeTeam.replace(`Legacy FC (${playerName})`, "Você")}
                  </h3>
                </div>
                
                <div className="text-center font-mono w-1/5 bg-black px-3 py-1.5 border border-[#1F2937] rounded-xl flex items-center justify-center gap-1.5">
                  <span className="font-extrabold text-base text-white">
                    {activeLiveEvents.filter(e => e.team === "home" && e.type === "goal").length}
                  </span>
                  <span className="text-zinc-500 font-bold">:</span>
                  <span className="font-extrabold text-base text-white">
                    {activeLiveEvents.filter(e => e.team === "away" && e.type === "goal").length}
                  </span>
                </div>

                <div className="text-right w-2/5">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                    {activeLiveMatch.awayTeam.replace(`Legacy FC (${playerName})`, "Você")}
                  </h3>
                </div>
              </div>

              {/* Ticking Clock minutes */}
              <div className="text-xs font-mono text-[#D4AF37] pt-3">
                Tempo: <strong className="text-sm font-black">{activeLiveMinute}'</strong>
              </div>
            </div>

            {/* Scrolling minute by minute narrative events */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto text-left pr-2 bg-black p-4 rounded-xl border border-[#1F2937]">
              {activeLiveEvents.length === 0 ? (
                <div className="text-zinc-650 text-center py-6 text-xs font-mono">
                  Se preparando para o pontapé inicial...
                </div>
              ) : (
                activeLiveEvents.map((evt, idx) => {
                  const isGoal = evt.type === "goal";
                  const isSave = evt.type === "save";
                  const isErr = evt.type === "error";

                  return (
                    <div key={idx} className="flex gap-2.5 items-start text-xs border-b border-[#1F2937] pb-2 leading-relaxed animate-slide-in">
                      <span className="font-mono text-[#D4AF37] font-extrabold min-w-7">{evt.minute}'</span>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5 font-bold">
                          {isGoal && <span className="text-green-500">⚽ Goal!</span>}
                          {isSave && <span className="text-blue-500">🛡️ Defesa!</span>}
                          {isErr && <span className="text-red-500">⚠️ Falha!</span>}
                          <span className="text-zinc-300">{evt.player}</span>
                        </div>
                        <p className="text-zinc-400">{evt.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Actions to finish */}
            <div className="flex gap-3 justify-center">
              {userInAction ? (
                <button
                  onClick={skipActiveTicker}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-[#1F2937] text-zinc-300 font-mono text-xs rounded-xl transition-all cursor-pointer"
                >
                  Pular Simulação
                </button>
              ) : (
                <button
                  onClick={handleTransitionNext}
                  className="px-8 py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold text-xs rounded-xl uppercase tracking-wider cursor-pointer transition-all shadow-md"
                >
                  CONCLUIR PARTIDA
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
