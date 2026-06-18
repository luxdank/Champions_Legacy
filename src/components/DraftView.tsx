import { useState, useEffect } from "react";
import { Users, Info, ShieldAlert, Sparkles, CheckCircle2, RotateCcw, Flame } from "lucide-react";
import { Formation, DraftSlot, Player, LegacyTeam } from "../types";
import { LEGACY_TEAMS } from "../data/teams";
import { calculateSquadMetrics } from "../utils/simulator";
import { playDraftChime } from "../utils/audio";

interface DraftViewProps {
  playerName: string;
  onDraftComplete: (formation: Formation, slots: DraftSlot[]) => void;
  onCancel: () => void;
}

const FORMATIONS: Formation[] = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2"];

export default function DraftView({ playerName, onDraftComplete, onCancel }: DraftViewProps) {
  const [formation, setFormation] = useState<Formation | null>(null);
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [errorWarning, setErrorWarning] = useState<string | null>(null);
  const [rerollsRemaining, setRerollsRemaining] = useState<number>(3);

  // Club and Season counts to check rules: Max 3 per club, Max 2 per season
  const [clubCounts, setClubCounts] = useState<{ [key: string]: number }>({});
  const [seasonCounts, setSeasonCounts] = useState<{ [key: string]: number }>({});

  // Choose a formation and auto-initialize the slots
  const selectFormation = (selected: Formation) => {
    setFormation(selected);
    setRerollsRemaining(3);

    // Map of positions based on the selected formation
    let positions: Player["position"][] = [];
    if (selected === "4-3-3") {
      positions = ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CAM", "LW", "ST", "RW"];
    } else if (selected === "4-4-2") {
      positions = ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"];
    } else if (selected === "4-2-3-1") {
      positions = ["GK", "LB", "CB", "CB", "RB", "CDM", "CDM", "CAM", "LM", "RM", "ST"];
    } else if (selected === "3-5-2") {
      positions = ["GK", "CB", "CB", "CB", "LM", "CDM", "CM", "CAM", "RM", "ST", "ST"];
    }

    const initialSlots: DraftSlot[] = positions.map((pos, idx) => ({
      index: idx,
      position: pos,
      draftedPlayer: null,
      teamOptions: []
    }));

    setSlots(initialSlots);
    setClubCounts({});
    setSeasonCounts({});
    setErrorWarning(null);

    // Automatically trigger selection of the first slot
    triggerOptionsForSlot(0, positions[0], initialSlots);
  };

  // Roll 3 distinct potential teams for the specified slot & find a player fitting that nominated position!
  const triggerOptionsForSlot = (
    index: number,
    position: Player["position"],
    currentSlots: DraftSlot[]
  ) => {
    // Shuffle the legacy teams
    const shuffledTeams = [...LEGACY_TEAMS].sort(() => 0.5 - Math.random());
    const selectedOptions: { team: LegacyTeam; playerOptions: Player[] }[] = [];

    // Filter teams to find those that have players in this tactical position
    for (const team of shuffledTeams) {
      if (selectedOptions.length >= 3) break;

      const matchedPlayers = team.players.filter(p => {
        // If exact position matches
        if (p.position === position) return true;
        // Or if we need midfield CM and player is CDM/CAM (flexible)
        if (position === "CM" && ["CDM", "CAM", "RM", "LM"].includes(p.position)) return true;
        if (position === "CDM" && ["CM"].includes(p.position)) return true;
        if (position === "CAM" && ["CM", "LM", "RM"].includes(p.position)) return true;
        if (position === "ST" && ["LW", "RW"].includes(p.position)) return true;
        if (["LW", "RW"].includes(position) && p.position === "ST") return true;
        return false;
      });

      if (matchedPlayers.length > 0) {
        selectedOptions.push({
          team,
          playerOptions: matchedPlayers
        });
      }
    }

    // Update slots state
    setSlots(prev => prev.map((s, i) => {
      if (i === index) {
        return { ...s, teamOptions: selectedOptions };
      }
      return s;
    }));

    setActiveSlotIndex(index);
    setErrorWarning(null);
  };

  // Select player for the active slot
  const handleSelectPlayer = (player: Player, team: LegacyTeam) => {
    if (activeSlotIndex === null) return;

    // RULE CHECK: Max 3 players from same club
    const currentClubCount = clubCounts[team.club] || 0;
    if (currentClubCount >= 3) {
      setErrorWarning(`Restrição desrespeitada! Você já atingiu o limite de 3 atletas do clube: ${team.club}`);
      return;
    }

    // RULE CHECK: Max 2 players from same season
    const currentSeasonCount = seasonCounts[player.year] || 0;
    if (currentSeasonCount >= 2) {
      setErrorWarning(`Restrição desrespeitada! Você já atingiu o limite de 2 atletas da temporada: ${player.year}`);
      return;
    }

    // Apply the selection
    const updatedSlots = [...slots];
    const previousPlayer = updatedSlots[activeSlotIndex].draftedPlayer;

    updatedSlots[activeSlotIndex].draftedPlayer = player;
    setSlots(updatedSlots);
    
    // Play chime sound trigger
    playDraftChime();

    // Update rule counters
    const newClubCounts = { ...clubCounts };
    const newSeasonCounts = { ...seasonCounts };

    // Subtract previous player limits if any (override scenario)
    if (previousPlayer) {
      // Find team of previous player to deduct
      const prevTeam = LEGACY_TEAMS.find(t => t.players.some(p => p.id === previousPlayer.id));
      if (prevTeam) {
        newClubCounts[prevTeam.club] = Math.max(0, (newClubCounts[prevTeam.club] || 0) - 1);
      }
      newSeasonCounts[previousPlayer.year] = Math.max(0, (newSeasonCounts[previousPlayer.year] || 0) - 1);
    }

    // Add new caps
    newClubCounts[team.club] = (newClubCounts[team.club] || 0) + 1;
    newSeasonCounts[player.year] = (newSeasonCounts[player.year] || 0) + 1;

    setClubCounts(newClubCounts);
    setSeasonCounts(newSeasonCounts);
    setErrorWarning(null);

    // Find next undrafted slot automatically
    const nextSlotIdx = updatedSlots.findIndex((s, idx) => s.draftedPlayer === null && idx > activeSlotIndex);
    const firstUndrafted = updatedSlots.findIndex(s => s.draftedPlayer === null);

    const targetIdx = nextSlotIdx !== -1 ? nextSlotIdx : (firstUndrafted !== -1 ? firstUndrafted : null);

    if (targetIdx !== null) {
      triggerOptionsForSlot(targetIdx, updatedSlots[targetIdx].position, updatedSlots);
    } else {
      // All slots are completed! Open focus feedback to review team.
      setActiveSlotIndex(null);
    }
  };

  // Clear a slot to pick again
  const handleClearSlot = (index: number) => {
    const slot = slots[index];
    if (!slot || !slot.draftedPlayer) return;

    const previousPlayer = slot.draftedPlayer;
    const prevTeam = LEGACY_TEAMS.find(t => t.players.some(p => p.id === previousPlayer.id));

    // Deduct parameters
    const newClubCounts = { ...clubCounts };
    const newSeasonCounts = { ...seasonCounts };

    if (prevTeam) {
      newClubCounts[prevTeam.club] = Math.max(0, (newClubCounts[prevTeam.club] || 0) - 1);
    }
    newSeasonCounts[previousPlayer.year] = Math.max(0, (newSeasonCounts[previousPlayer.year] || 0) - 1);

    setClubCounts(newClubCounts);
    setSeasonCounts(newSeasonCounts);

    const updatedSlots = [...slots];
    updatedSlots[index].draftedPlayer = null;
    setSlots(updatedSlots);

    triggerOptionsForSlot(index, slot.position, updatedSlots);
  };

  const handleRerollActiveSlot = () => {
    if (activeSlotIndex === null || rerollsRemaining <= 0) return;
    setRerollsRemaining(prev => prev - 1);
    triggerOptionsForSlot(activeSlotIndex, slots[activeSlotIndex].position, slots);
  };

  // Compute stats on the fly
  const metrics = formation ? calculateSquadMetrics(slots, formation) : null;
  const isComplete = slots.length > 0 && slots.every(s => s.draftedPlayer !== null);

  const activeSlot = activeSlotIndex !== null ? slots[activeSlotIndex] : null;

  return (
    <div className="space-y-8 animate-fade-in text-white">
      
      {/* Header Panel */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#1F2937]/30 p-6 rounded-xl border border-[#1F2937] gap-4">
        <div>
          <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider block">PAINEL DE COMANDO TÁTICO</span>
          <h2 className="text-2xl font-black font-display text-white">PROCESSO DE RECRUTAMENTO</h2>
          <p className="text-zinc-500 text-xs mt-1">Treinador ativo: <strong className="text-zinc-300">{playerName}</strong></p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#1F2937]/30 hover:bg-[#1F2937]/50 text-zinc-400 border border-[#1F2937] font-mono text-xs rounded-lg transition-all cursor-pointer"
          >
            ABANDONAR
          </button>
        </div>
      </header>

      {/* PHASE 1: CHOOSE FORMATION */}
      {!formation ? (
        <div className="bg-[#1F2937]/30 rounded-xl p-8 border border-[#1F2937] text-center space-y-6 max-w-xl mx-auto py-12">
          <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-display">ESCOLHA SEU ESQUEMA TÁTICO</h3>
            <p className="text-zinc-400 text-xs max-w-sm mx-auto">
              A formação tática ditará as posições disponíveis no campo e influenciará a química de setores defensivos, ofensivos e de meio campo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            {FORMATIONS.map((form) => (
              <button
                key={form}
                onClick={() => selectFormation(form)}
                className="p-4 bg-black/40 hover:bg-black/60 hover:border-[#D4AF37]/40 border border-[#1F2937] rounded-xl font-black font-display text-lg tracking-wider transition-all hover:scale-103 active:scale-95 cursor-pointer"
              >
                {form}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* PHASE 2: ACTIVE RECRUITING ARENA */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Pitch & Slot Status (7 Cols) */}
          <div className="lg:col-span-7 bg-[#1F2937]/30 border border-[#1F2937] rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#1F2937] pb-3">
              <span className="font-bold text-sm tracking-widest font-mono text-zinc-400">CAMPO DE ESTRATÉGIA ({formation})</span>
              <span className="text-xs bg-[#1F2937]/30 text-zinc-400 border border-[#1F2937] font-mono px-2 py-0.5 rounded">
                DRAFTADO: {slots.filter(s => s.draftedPlayer !== null).length} / 11
              </span>
            </div>

            {/* Tactical Football Pitch Graphic Representation */}
            <div className="relative bg-black/40 rounded-xl p-4 border border-[#1F2937] flex flex-col justify-between overflow-hidden aspect-[4/5] sm:aspect-[4/4] max-w-lg mx-auto shadow-2xl">
              <div className="absolute inset-0 border border-[#1F2937]/40 pointer-events-none" />
              {/* Center circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-[#1F2937]/20 rounded-full pointer-events-none" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 w-full h-[1px] bg-[#1F2937]/20 pointer-events-none" />
              {/* Penalty Boxes */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-44 h-14 border-x border-b border-[#1F2937]/20 pointer-events-none" />
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-44 h-14 border-x border-t border-[#1F2937]/20 pointer-events-none" />

              {/* Roster Positions list grouped as grid rows */}
              <div className="z-10 h-full flex flex-col justify-between py-2 space-y-4">
                
                {/* Attack Row */}
                <div className="flex justify-center gap-4">
                  {slots
                    .filter(s => ["ST", "LW", "RW"].includes(s.position))
                    .map(slot => (
                      <div key={slot.index} className="flex flex-col items-center">
                        <PitchSlotCard
                          slot={slot}
                          isActive={activeSlotIndex === slot.index}
                          onClick={() => {
                            if (slot.draftedPlayer !== null) return;
                            setActiveSlotIndex(slot.index);
                            triggerOptionsForSlot(slot.index, slot.position, slots);
                          }}
                          onClear={() => {}}
                          isComplete={isComplete}
                        />
                      </div>
                    ))}
                </div>

                {/* Midfield Row */}
                <div className="flex justify-center gap-4">
                  {slots
                    .filter(s => ["CM", "CDM", "CAM", "LM", "RM"].includes(s.position))
                    .map(slot => (
                      <div key={slot.index} className="flex flex-col items-center">
                        <PitchSlotCard
                          slot={slot}
                          isActive={activeSlotIndex === slot.index}
                          onClick={() => {
                            if (slot.draftedPlayer !== null) return;
                            setActiveSlotIndex(slot.index);
                            triggerOptionsForSlot(slot.index, slot.position, slots);
                          }}
                          onClear={() => {}}
                          isComplete={isComplete}
                        />
                      </div>
                    ))}
                </div>

                {/* Defense Row */}
                <div className="flex justify-center gap-4">
                  {slots
                    .filter(s => ["CB", "LB", "RB"].includes(s.position))
                    .map(slot => (
                      <div key={slot.index} className="flex flex-col items-center">
                        <PitchSlotCard
                          slot={slot}
                          isActive={activeSlotIndex === slot.index}
                          onClick={() => {
                            if (slot.draftedPlayer !== null) return;
                            setActiveSlotIndex(slot.index);
                            triggerOptionsForSlot(slot.index, slot.position, slots);
                          }}
                          onClear={() => {}}
                          isComplete={isComplete}
                        />
                      </div>
                    ))}
                </div>

                {/* Goalkeeper */}
                <div className="flex justify-center">
                  {slots
                    .filter(s => s.position === "GK")
                    .map(slot => (
                      <div key={slot.index} className="flex flex-col items-center">
                        <PitchSlotCard
                          slot={slot}
                          isActive={activeSlotIndex === slot.index}
                          onClick={() => {
                            if (slot.draftedPlayer !== null) return;
                            setActiveSlotIndex(slot.index);
                            triggerOptionsForSlot(slot.index, slot.position, slots);
                          }}
                          onClear={() => {}}
                          isComplete={isComplete}
                        />
                      </div>
                    ))}
                </div>

              </div>
            </div>

            {/* List View fallback for smaller interaction/better detail lists */}
            <div className="block sm:hidden bg-black/40 border border-[#1F2937] rounded-lg p-3 space-y-1 text-xs">
              <span className="font-bold text-[10px] text-zinc-500 font-mono block mb-1 uppercase">Visualizar lista completa de posições:</span>
              <div className="grid grid-cols-2 gap-2">
                {slots.map(s => (
                  <button
                    key={s.index}
                    onClick={() => {
                      if (s.draftedPlayer !== null) return;
                      setActiveSlotIndex(s.index);
                      triggerOptionsForSlot(s.index, s.position, slots);
                    }}
                    className={`p-2 rounded text-left flex justify-between items-center ${
                      s.draftedPlayer ? "bg-black/60 border border-[#1F2937] cursor-not-allowed" : "bg-[#1F2937]/10 text-zinc-400"
                    }`}
                  >
                    <span className="font-mono">{s.position}: {s.draftedPlayer?.name || "Pendente"}</span>
                    <span className="text-[10px] text-[#D4AF37] font-bold">
                      {s.draftedPlayer ? (isComplete ? s.draftedPlayer.overall : "?") : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Player Options selector / Active Drafting Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Real-time metrics overview */}
            {metrics && (
              <div className="bg-[#1F2937]/30 border border-[#1F2937] rounded-xl p-5 space-y-4">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wide">AVALIAÇÃO DA EQUIPE EM TEMPO REAL</span>
                
                <div className="grid grid-cols-5 gap-3 text-center">
                  <div className="bg-black/40 p-2 rounded-lg border border-[#1F2937]">
                    <span className="text-[9px] text-zinc-500 font-mono block">GERAL</span>
                    <span className="text-lg font-black text-white">{isComplete ? metrics.overall : "?"}</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-[#1F2937]">
                    <span className="text-[9px] text-zinc-500 font-mono block">ATAQUE</span>
                    <span className="text-lg font-black text-[#D4AF37]">{isComplete ? metrics.attack : "?"}</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-[#1F2937]">
                    <span className="text-[9px] text-zinc-500 font-mono block">MEIO</span>
                    <span className="text-lg font-black text-[#2563EB]">{isComplete ? metrics.midfield : "?"}</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-[#1F2937]">
                    <span className="text-[9px] text-zinc-500 font-mono block">DEFESA</span>
                    <span className="text-lg font-black text-zinc-400">{isComplete ? metrics.defense : "?"}</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-[#1F2937] relative overflow-hidden group">
                    <span className="text-[9px] text-zinc-500 font-mono block">QUÍMICA</span>
                    <span className={`text-lg font-black block ${metrics.chemistry > 75 ? "text-green-500" : (metrics.chemistry > 45 ? "text-[#D4AF37]" : "text-zinc-500")}`}>
                      {metrics.chemistry}%
                    </span>
                  </div>
                </div>

                {/* Constraints indicators */}
                <div className="border-t border-[#1F2937] px-1 pt-3.5 space-y-2">
                  <span className="text-[9px] font-mono text-zinc-500 block uppercase">RESTRIÇÕES DO CHALLENGE:</span>
                  
                  <div className="flex justify-between text-xs text-zinc-400 font-mono bg-black/40 p-2 rounded border border-[#1F2937]">
                    <span>Clubes ativos (Máx 3):</span>
                    <div className="flex gap-2">
                      {Object.keys(clubCounts).filter(k => clubCounts[k] > 0).map(c => (
                        <span key={c} className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${clubCounts[c] >= 3 ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-black/40 border border-[#1F2937]"}`}>
                          {c.slice(0, 5)}: {clubCounts[c]}
                        </span>
                      ))}
                      {Object.keys(clubCounts).filter(k=>clubCounts[k]>0).length === 0 && <span className="text-zinc-600">Nenhum</span>}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-zinc-400 font-mono bg-black/40 p-2 rounded border border-[#1F2937]">
                    <span>Temporadas (Máx 2):</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {Object.keys(seasonCounts).filter(k => seasonCounts[k] > 0).map(s => (
                        <span key={s} className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${seasonCounts[s] >= 2 ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-black/40 border border-[#1F2937]"}`}>
                          '{s.slice(2, 4)}: {seasonCounts[s]}
                        </span>
                      ))}
                      {Object.keys(seasonCounts).filter(k=>seasonCounts[k]>0).length === 0 && <span className="text-zinc-600">Nenhum</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Candidate Selector Panel */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
              
              {activeSlot ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-90 pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 block uppercase">OPÇÕES SELECIONÁVEIS PARA</span>
                      <h4 className="font-extrabold text-base text-white">Posição: <span className="text-amber-500">{activeSlot.position}</span></h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded font-semibold">
                      Sorteado
                    </span>
                  </div>

                  {/* Dynamic Interactive Draft Reroller Feature */}
                  <div className="flex justify-between items-center bg-[#1F2937]/10 p-3 rounded-xl border border-[#1F2937]/40 gap-3">
                    <div className="text-left">
                      <span className="text-[9px] font-mono text-zinc-400 block uppercase tracking-wider">SORTEAR NOVAMENTE</span>
                      <span className="text-[11px] text-zinc-300 font-medium">Refazer opções para esta posição</span>
                    </div>
                    <button
                      disabled={rerollsRemaining <= 0}
                      onClick={handleRerollActiveSlot}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[10px] tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                        rerollsRemaining > 0
                          ? "bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/35 hover:border-[#D4AF37]/75 text-[#D4AF37] active:scale-95 shadow-sm"
                          : "bg-zinc-900/55 border-zinc-850/50 text-zinc-650 cursor-not-allowed"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>SORTear ({rerollsRemaining})</span>
                    </button>
                  </div>

                  {errorWarning && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs flex items-start gap-2 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorWarning}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {activeSlot.teamOptions.map(({ team, playerOptions }) => {
                      const selectedCandidate = playerOptions[0]; // Take the corresponding position player
                      if (!selectedCandidate) return null;

                      const countClub = clubCounts[team.club] || 0;
                      const countSeason = seasonCounts[selectedCandidate.year] || 0;

                      const clubViolated = countClub >= 3;
                      const seasonViolated = countSeason >= 2;

                      const isClickable = !clubViolated && !seasonViolated;

                      return (
                        <div
                          key={selectedCandidate.id}
                          onClick={() => {
                            if (isClickable) {
                              handleSelectPlayer(selectedCandidate, team);
                            } else {
                              setErrorWarning(
                                clubViolated 
                                  ? `Limite de 3 atletas esgotado para o clube ${team.club}!` 
                                  : `Limite de 2 atletas esgotado para a temporada de ${selectedCandidate.year}!`
                              );
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between gap-4 cursor-pointer group ${
                            isClickable
                              ? "bg-black/30 hover:bg-black/50 border-[#1F2937] hover:border-[#D4AF37]/50"
                              : "bg-black/10 border-red-900/30 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          {/* Inner glow */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/2 rounded-full blur-2xl group-hover:bg-[#D4AF37]/5 transition-all" />

                               <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="text-[10px] text-zinc-500 block font-mono uppercase">
                                {team.club} • {selectedCandidate.year}
                              </span>
                              <h5 className="font-black text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                                {selectedCandidate.name}
                              </h5>
                              <div className="flex gap-2 text-[10px] text-zinc-400 font-mono mt-1">
                                <span>Peak: <strong className="text-zinc-300">{selectedCandidate.peak}/10</strong></span>
                                <span>Clutch: <strong className="text-zinc-300">{selectedCandidate.clutch}/10</strong></span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-mono text-zinc-500 block leading-none mb-0.5">{selectedCandidate.position}</span>
                              <span className="text-xl font-black text-[#D4AF37] font-display">?</span>
                            </div>
                          </div>

                          {/* Block Warning Badges */}
                          {(!isClickable) && (
                            <div className="text-[10px] font-semibold text-red-500 flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded w-fit z-10 font-mono">
                              <ShieldAlert className="w-3 h-3" />
                              <span>{clubViolated ? "INDISPONÍVEL: Limite Clube (3)" : "INDISPONÍVEL: Limite Ano (2)"}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-zinc-500 space-y-3">
                  <div className="w-10 h-10 bg-[#1F2937]/30 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                    <Info className="w-5 h-5" />
                  </div>
                  {isComplete ? (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-zinc-300">
                        Parabéns! Elenco regularizado com 11 guerreiros pronto para entrar no gramado.
                      </p>
                      <button
                        onClick={() => onDraftComplete(formation, slots)}
                        className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#E5C048] text-black font-extrabold rounded-lg shadow-lg font-display text-xs tracking-wider transition-all transform active:scale-95 cursor-pointer"
                      >
                        INICIAR CAMPANHA NA UCL!
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs max-w-xs mx-auto leading-relaxed">
                      Selecione um slot pendente no campo de estratégia ao lado para abrir os reforços lendários sorteados e avançar.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Draft overview panel */}
            <div className="bg-[#1F2937]/30 border border-[#1F2937] rounded-xl p-5 text-xs text-zinc-500 leading-relaxed space-y-2">
              <span className="font-bold text-[10px] text-zinc-400 block font-mono uppercase">CONSELHO DO MANAGER:</span>
              <p>
                Os atributos "Peak" e "Clutch" influenciam diretamente no momento de maior exigência tática (como finais da UCL ou prorrogações). Conectar atletas da mesma equipe ou temporada garante um bônus poderoso de química!
              </p>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

// Internal Sub Component: Pitch Slot Card
interface PitchSlotCardProps {
  slot: DraftSlot;
  isActive: boolean;
  onClick: () => void;
  onClear: () => void;
  isComplete: boolean;
}

function PitchSlotCard({ slot, isActive, onClick, onClear, isComplete }: PitchSlotCardProps) {
  const player = slot.draftedPlayer;

  if (player) {
    return (
      <div
        className={`w-14 sm:w-18 relative rounded-lg border p-1 sm:p-2 flex flex-col justify-between aspect-[3/4.2] group transition-all text-center ${
          isActive 
            ? "border-[#D4AF37] bg-black/60 shadow-md shadow-[#D4AF37]/10" 
            : "border-[#1F2937] bg-black/40"
        }`}
      >
        <div className="flex justify-between items-center z-10 leading-none">
          <span className="text-[7px] sm:text-[9px] font-mono text-zinc-500">{slot.position}</span>
          <span className="text-[10px] sm:text-xs font-black text-[#D4AF37] font-mono">{isComplete ? player.overall : "?"}</span>
        </div>

        <div className="my-1 sm:my-2 overflow-hidden z-10">
          <p className="text-[8px] sm:text-[10px] font-bold text-white truncate max-w-full leading-tight font-sans">
            {player.name.split(" ").pop() || player.name}
          </p>
          <span className="text-[6px] sm:text-[8px] text-zinc-500 block scale-90 font-mono mt-0.5 leading-none">
            '{player.year.slice(2, 4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-14 sm:w-18 rounded-lg border-2 border-dashed flex flex-col justify-center items-center aspect-[3/4.2] transition-all cursor-pointer ${
        isActive
          ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]"
          : "border-[#1F2937] bg-black/40 text-zinc-600 hover:text-zinc-500 hover:border-zinc-700 hover:bg-black/60"
      }`}
    >
      <span className="text-[7px] sm:text-[9px] font-bold font-mono text-zinc-500 uppercase leading-none block mb-1">
        {slot.position}
      </span>
      <span className="text-sm font-light font-display">+</span>
    </button>
  );
}
