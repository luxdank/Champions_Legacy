import { useState, useEffect } from "react";
import { Sparkles, Trophy, Share2, Clipboard, RotateCcw, Award, ShieldAlert, BarChart2, Star, Save } from "lucide-react";
import { Formation, DraftSlot, Player, SimulatedMatch, LeaderboardEntry } from "../types";
import { LEGENDARY_MANAGERS } from "../data/managers";

interface NarrativeViewProps {
  formation: Formation;
  slots: DraftSlot[];
  playerName: string;
  managerId?: string;
  matches: SimulatedMatch[];
  wonTournament: boolean;
  onRestart: () => void;
}

interface NarrativeData {
  champion: string;
  topScorer: string;
  bestPlayer: string;
  bestDefense: string;
  bestSigning: string;
  biggestBlunder: string;
  fullCommentary: string;
}

export default function NarrativeView({
  formation,
  slots,
  playerName,
  managerId,
  matches,
  wonTournament,
  onRestart
}: NarrativeViewProps) {
  // 1. Core State
  const [narrative, setNarrative] = useState<NarrativeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>("Compartilhar Card");

  // Find chosen manager details if present
  const activeManager = LEGENDARY_MANAGERS.find(m => m.id === managerId);
  const managerOvrBoost = activeManager && activeManager.boostType === "clutch" ? 1.5 : 0;
  const managerChemBoost = activeManager && activeManager.boostType === "chemistry" ? 5 : 0;

  // Recalculate OVR/Chemistry
  const players = slots.map(s => s.draftedPlayer).filter((p): p is Player => p !== null);
  const ovr = players.length > 0 ? Math.round((players.reduce((sum, p) => sum + p.overall, 0) / players.length) + managerOvrBoost) : 80;
  
  let chemistry = 50;
  if (players.length > 0) {
    let chem = 40;
    const clubCounts: { [key: string]: number } = {};
    const seasonCounts: { [key: string]: number } = {};
    players.forEach(p => {
      p.clubs.forEach(c => { clubCounts[c] = (clubCounts[c] || 0) + 1; });
      seasonCounts[p.year] = (seasonCounts[p.year] || 0) + 1;
    });
    Object.values(clubCounts).forEach(count => { if (count > 1) chem += (count - 1) * 8; });
    Object.values(seasonCounts).forEach(count => { if (count > 1) chem += (count - 1) * 10; });
    chemistry = Math.max(10, Math.min(100, chem + managerChemBoost));
  }

  // Calculate final score
  // Score = (OVR * 4) + (Chemistry * 3) + (TrophySurvivalMultiplier * 120)
  const lastMatch = matches && matches.length > 0 ? matches[matches.length - 1] : null;
  let multiplier = 1; // Round of 16
  if (lastMatch) {
    if (lastMatch.stage === "Quartas") multiplier = 2;
    else if (lastMatch.stage === "Semifinal") multiplier = 3;
    else if (lastMatch.stage === "Final") multiplier = wonTournament ? 4 : 4; 
  }
  const finalScore = (ovr * 4) + Math.round(chemistry * 3) + (multiplier * 120);

  // 2. Fetch narrative from Server API on mount
  useEffect(() => {
    async function fetchNarrative() {
      try {
        const lineupNames = slots.map(s => s.draftedPlayer?.name || "Jogador");
        const res = await fetch("/api/generate-narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches,
            lineup: lineupNames,
            formation,
            coaching: playerName,
            ovr,
            chemistry,
            wonTournament
          })
        });

        if (res.ok) {
          const data = await res.json();
          setNarrative(data);
        } else {
          throw new Error("Erro ao acessar API");
        }
      } catch (err) {
        console.error("Erro ao puxar crônicas, usando gerador offline:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNarrative();
  }, []);

  // 3. Save score to Server Leaderboard
  const handleSaveScore = async () => {
    if (scoreSaved) return;
    try {
      const lineupNames = slots.map(s => s.draftedPlayer?.name || "Jogador");
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          score: finalScore,
          formation,
          ovr,
          chemistry,
          lineup: lineupNames,
          champions: wonTournament,
          trophiesCount: multiplier,
          narrative: narrative ? {
            champion: narrative.champion,
            topScorer: narrative.topScorer,
            bestPlayer: narrative.bestPlayer,
            bestDefense: narrative.bestDefense,
            bestSigning: narrative.bestSigning,
            biggestBlunder: narrative.biggestBlunder
          } : undefined
        })
      });

      if (res.ok) {
        setScoreSaved(true);
      }
    } catch (err) {
      console.error("Erro ao salvar no ranking:", err);
    }
  };

  // 4. Clipboard copy helper
  const handleCopyToClipboard = () => {
    const cardText = `━━━━━━━━━━━━
CHAMPIONS LEGACY

🏆 Campeão: ${narrative?.champion || (wonTournament ? "Você!" : "Adversário")}
Formação: ${formation}
⭐ OVR: ${ovr}

Artilheiro: ${narrative?.topScorer || "Não registrado"}

⚽ Treinador: ${playerName}
📊 Pontos: ${finalScore}

#ChampionsLegacy
━━━━━━━━━━━━`;

    navigator.clipboard.writeText(cardText).then(() => {
      setCopyStatus("Copiado com sucesso!");
      setTimeout(() => setCopyStatus("Compartilhar Card"), 2000);
    }).catch(err => {
      console.error("Erro ao copiar para clipboard:", err);
    });
  };

  return (
    <div className="space-y-8 animate-fade-in text-white max-w-4xl mx-auto">
      
      {/* Cinematic Headline Banner */}
      <div className="relative text-center overflow-hidden bg-[#09090B] border border-[#1F2937] rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-44 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full text-[#D4AF37] text-[10px] font-bold tracking-widest uppercase">
          <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37] animate-spin" /> CAMPANHA FINALIZADA
        </div>

        <h1 className="text-3xl md:text-5xl font-bold font-display text-white tracking-tight">
          {wonTournament ? "ETERNIZADO NA GLÓRIA!" : "FIM DE JORNADA"}
        </h1>

        <p className="max-w-md mx-auto text-zinc-400 text-xs leading-relaxed">
          Sua campanha foi reportada e as estatísticas de draft e simulação foram compiladas. Veja seus registros abaixo.
        </p>

        {/* Score Indicator */}
        <div className="bg-black/35 border border-[#1F2937] py-4 px-6 rounded-2xl max-w-xs mx-auto shadow-inner">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">Pontuação Final</span>
          <span className="text-3xl font-extrabold font-display text-[#D4AF37]">{finalScore}</span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1">Calculada por OVR, química e sobrevivência.</span>
        </div>
      </div>

      {loading ? (
        /* LOADING GRAPHICAL ELEMENT */
        <div className="bg-[#09090B] border border-[#1F2937] p-12 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-xs font-mono animate-pulse">
            Redigindo crônicas esportivas com o correspondente Gemini 2.5 Flash...
          </p>
        </div>
      ) : (
        /* CONTENT LOADED */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Awards & Chronicle (7 Cols) */}
          <div className="md:col-span-7 bg-[#09090B] border border-[#1F2937] rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-[#1F2937] pb-3">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold font-display text-zinc-100 uppercase tracking-wide">PREMIAÇÕES UEFA</h2>
            </div>

            {narrative && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-black/20 p-4 border border-[#1F2937] rounded-xl hover:border-[#D4AF37]/20 transition-all">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">🏆 Campeão</span>
                  <p className="font-bold text-sm text-white mt-1">{narrative.champion}</p>
                </div>

                <div className="bg-black/20 p-4 border border-[#1F2937] rounded-xl hover:border-[#D4AF37]/20 transition-all">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">⚽ Artilheiro</span>
                  <p className="font-bold text-sm text-[#D4AF37] mt-1">{narrative.topScorer}</p>
                </div>

                <div className="bg-black/20 p-4 border border-[#1F2937] rounded-xl hover:border-[#D4AF37]/20 transition-all">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">🎯 Melhor Jogador</span>
                  <p className="font-bold text-sm text-white mt-1">{narrative.bestPlayer}</p>
                </div>

                <div className="bg-black/20 p-4 border border-[#1F2937] rounded-xl hover:border-[#D4AF37]/20 transition-all">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">🧱 Melhor Defesa</span>
                  <p className="font-bold text-sm text-white mt-1">{narrative.bestDefense}</p>
                </div>

                <div className="bg-black/20 p-4 border border-[#1F2937] rounded-xl hover:border-[#D4AF37]/20 transition-all">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">🔥 Destaque Draft</span>
                  <p className="font-bold text-sm text-white mt-1">{narrative.bestSigning}</p>
                </div>

                <div className="bg-black/20 p-4 border border-[#1F2937] rounded-xl hover:border-[#D4AF37]/20 transition-all">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">⚠️ Erro Tático</span>
                  <p className="font-bold text-sm text-red-400 mt-1">{narrative.biggestBlunder}</p>
                </div>

              </div>
            )}

            {/* Gemini Chronicle Sports text */}
            {narrative && (
              <div className="bg-[#D4AF37]/3 border border-[#D4AF37]/15 rounded-2xl p-5 space-y-2 text-left">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#D4AF37] block uppercase">
                  CRÔNICA UEFA LEGACY (AI REPORT)
                </span>
                <p className="text-zinc-300 text-sm leading-relaxed font-sans font-medium italic">
                  "{narrative.fullCommentary}"
                </p>
              </div>
            )}
          </div>

          {/* Share Card & Actions (5 Cols) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Real Graphic shareable textual block */}
            <div className="bg-black border border-[#1F2937] rounded-2xl p-6 text-left relative overflow-hidden font-mono text-xs text-zinc-400 space-y-4">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/10 rotate-45 transform translate-x-8 -translate-y-8 pointer-events-none" />
              
              <div className="border-b border-[#1F2937] pb-3">
                <h3 className="font-bold text-sm text-white tracking-wider">CHAMPIONS LEGACY</h3>
                <span className="text-[9px] text-zinc-500 uppercase">Resumo da Campanha</span>
              </div>

              <div className="space-y-1.5 leading-relaxed">
                <div>
                  🏆 Campeão: <strong className="text-white font-mono">{narrative?.champion || (wonTournament ? "Você" : "Adversário")}</strong>
                </div>
                <div>
                  Formação: <strong className="text-[#D4AF37] font-mono">{formation}</strong>
                </div>
                <div>
                  ⭐ Força Geral: <strong className="text-white font-mono">OVR {ovr}</strong>
                </div>
                <div className="border-t border-[#1F2937] my-2 pt-2">
                  Artilheiro: <strong className="text-zinc-200 font-mono">{narrative?.topScorer || "Não registrado"}</strong>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 font-bold border-t border-[#1F2937] pt-3 text-right">
                #ChampionsLegacy
              </div>
            </div>

            {/* Save Leaderboard Action Panel */}
            <div className="bg-[#09090B] border border-[#1F2937] rounded-2xl p-5 space-y-4 text-center">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">SALVAR PONTUAÇÃO</span>
                <h4 className="font-bold text-sm text-white mt-0.5">Deseja subir para o ranking global?</h4>
              </div>

              <button
                onClick={handleSaveScore}
                disabled={scoreSaved}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider ${
                  scoreSaved 
                    ? "bg-zinc-900 text-zinc-500 border border-[#1F2937] cursor-not-allowed" 
                    : "bg-[#2563EB] hover:bg-blue-600 text-white cursor-pointer transition-all shadow-md active:scale-95"
                }`}
              >
                {scoreSaved ? (
                  <>REGISTRADO COM SUCESSO ✔</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    REGISTRAR NO RANKING
                  </>
                )}
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCopyToClipboard}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-950 hover:bg-zinc-900 border border-[#1F2937] rounded-xl text-zinc-300 font-bold text-xs tracking-wider transition-all uppercase cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#D4AF37]" />
                {copyStatus === "Copiado com sucesso!" ? "Copiado!" : "Copiar Resumo para Área de Transferência"}
              </button>

              <button
                onClick={onRestart}
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold text-xs tracking-wider transition-all uppercase rounded-xl cursor-pointer shadow-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4 fill-black text-black" />
                DRAFTAR NOVO TIME
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
