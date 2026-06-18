import { useState, useEffect, FormEvent } from "react";
import { Trophy, Play, Users, Flame, ShieldAlert, Sparkles, UserCheck, BarChart2, Star, Quote } from "lucide-react";
import { LeaderboardEntry } from "../types";
import { LEGACY_TEAMS } from "../data/teams";
import { LEGENDARY_MANAGERS } from "../data/managers";

interface LandingViewProps {
  onStartDraft: (coachedBy: string, managerId: string) => void;
  leaderboard: LeaderboardEntry[];
}

export default function LandingView({ onStartDraft, leaderboard }: LandingViewProps) {
  const [playerName, setPlayerName] = useState("Pep Guardiola");
  const [selectedManagerId, setSelectedManagerId] = useState("guardiola");
  const [selectedTeamTab, setSelectedTeamTab] = useState(LEGACY_TEAMS[0].id);

  // Auto-fill selected legendary manager name if user changes selection
  const handleSelectManager = (mgrId: string) => {
    setSelectedManagerId(mgrId);
    const selectedManager = LEGENDARY_MANAGERS.find(m => m.id === mgrId);
    if (selectedManager) {
      setPlayerName(selectedManager.name);
    }
  };

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    onStartDraft(playerName.trim(), selectedManagerId);
  };

  const selectedTeamDetails = LEGACY_TEAMS.find(t => t.id === selectedTeamTab);

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Immersive Hero Section */}
      <section className="relative overflow-hidden bg-[#1F2937]/30 border border-[#1F2937] rounded-2xl p-6 md:p-12 text-center space-y-6">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-[#D4AF37] text-xs font-semibold uppercase tracking-widest font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          European Draft & Simulator
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight font-display text-white">
          CHAMPIONS <span className="text-[#D4AF37]">LEGACY</span>
        </h1>

        <p className="max-w-2xl mx-auto text-zinc-400 text-sm md:text-base leading-relaxed">
          O supremo jogo de estratégia tática. Monte um esquadrão imbatível recrutando craques das maiores campanhas europeias da história. Simule o torneio, desafie os gigantes e eternize sua liderança no Olimpo do futebol europeu.
        </p>

        {/* Legendary Manager Selection Grid */}
        <div className="space-y-4 max-w-4xl mx-auto mt-6">
          <div className="text-center">
            <h3 className="text-zinc-300 text-xs font-bold uppercase tracking-widest font-mono flex items-center justify-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
              ESCOLHA SEU TÉCNICO LENDÁRIO
              <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
            </h3>
            <p className="text-zinc-500 text-[11px] mt-1">
              Cada comandante concede um bônus único de atributo tático para sua equipe
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {LEGENDARY_MANAGERS.map((mgr) => {
              const isSelected = selectedManagerId === mgr.id;
              return (
                <button
                  key={mgr.id}
                  type="button"
                  onClick={() => handleSelectManager(mgr.id)}
                  className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer active:scale-98 ${
                    isSelected
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] ring-1 ring-[#D4AF37]/30 shadow-[#D4AF37]/5"
                      : "bg-[#1E293B]/20 border-[#1F2937] hover:border-zinc-700/80 hover:bg-[#1E293B]/40"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-black px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase rounded-bl">
                      Ativo
                    </div>
                  )}
                  
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block tracking-wider">
                      {mgr.specialty}
                    </span>
                    <h4 className="font-extrabold text-sm text-white mt-0.5">
                      {mgr.name}
                    </h4>
                    <p className="text-zinc-400 text-[11px] mt-1 leading-snug line-clamp-2">
                      {mgr.desc}
                    </p>
                  </div>
                  
                  <div className="mt-2.5 pt-2 border-t border-[#1F2937]/50 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold text-[#D4AF37] uppercase bg-[#D4AF37]/5 border border-[#D4AF37]/10 px-1.5 py-0.5 rounded">
                      {mgr.boostDesc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inspirational Manager Quote container */}
          {LEGENDARY_MANAGERS.find(mgr => mgr.id === selectedManagerId) && (
            <div className="flex items-center justify-center gap-2 max-w-xl mx-auto px-4 py-2 bg-black/30 border border-[#1F2937]/50 rounded-lg text-zinc-400 text-xs italic">
              <Quote className="w-3.5 h-3.5 stroke-1 text-[#D4AF37] shrink-0" />
              <span>"{LEGENDARY_MANAGERS.find(mgr => mgr.id === selectedManagerId)?.quote}"</span>
            </div>
          )}
        </div>

        {/* Start Game Form Card */}
        <form onSubmit={handleStart} className="max-w-md mx-auto p-1 bg-black/80 border border-[#1F2937] rounded-xl focus-within:border-[#D4AF37]/50 transition-all flex items-center gap-2 mt-4 shadow-xl">
          <input
            id="coach-name-input"
            type="text"
            placeholder="Nome do Treinador..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="flex-1 bg-transparent px-4 py-3 text-white text-sm outline-none placeholder:text-zinc-500 font-sans font-medium"
            maxLength={22}
            required
          />
          <button
            id="start-draft-btn"
            type="submit"
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm px-6 py-3 rounded-lg transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            JOGAR AGORA
          </button>
        </form>

        <p className="text-xs text-zinc-500 mt-2">
          Anônimo / Salve local e participe do ranking de treinadores automaticamente
        </p>
      </section>

      {/* Main Grid: Leaderboard & LEGACY TEAMS SHOWCASE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* RANKING (Leaderboard) - Left Panel (7 Cols) */}
        <div className="lg:col-span-7 bg-[#1F2937]/30 border border-[#1F2937] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-xl font-bold font-display text-white">MURAL DA GLÓRIA</h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">HALL OF FAME</span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 space-y-2">
                <BarChart2 className="w-12 h-12 mx-auto stroke-1" />
                <p>Nenhuma campanha registrada no momento.</p>
              </div>
            ) : (
              leaderboard.map((entry, index) => {
                const colors = [
                  "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30",
                  "bg-zinc-300/10 text-zinc-300 border-zinc-300/20",
                  "bg-[#D4AF37]/10 text-amber-600 border-[#D4AF37]/20",
                ];
                const badgeStyle = colors[index] || "bg-black/40 text-zinc-400 border-[#1F2937]";

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-black/40 border border-[#1F2937] rounded-xl hover:border-zinc-700 transition-all gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono border text-sm ${badgeStyle}`}>
                        {index + 1}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{entry.playerName}</span>
                          {entry.champions && (
                            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase">
                              🏆 Campeão
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-zinc-500 text-xs">
                          <span>Formação: <strong className="text-zinc-400">{entry.formation}</strong></span>
                          <span>•</span>
                          <span>OVR: <strong className="text-[#D4AF37]">{entry.ovr}</strong></span>
                          <span>•</span>
                          <span>Entrosamento: <strong className="text-[#2563EB]">{entry.chemistry}%</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pl-11 sm:pl-0 border-t sm:border-t-0 border-[#1F2937] pt-2 sm:pt-0">
                      <div className="text-zinc-650 text-[11px] font-mono leading-none">
                        {entry.date}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black font-display text-white">{entry.score}</span>
                        <span className="text-[10px] font-mono text-[#D4AF37] block">PONTOS</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* LEGACY TEAMS SHOWCASE - Right Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-[#1F2937]/30 border border-[#1F2937] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-[#1F2937] pb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold font-display text-white">ELITES HISTÓRICAS</h2>
          </div>

          {/* Roster tab selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {LEGACY_TEAMS.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamTab(team.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all whitespace-nowrap cursor-pointer ${
                  selectedTeamTab === team.id
                    ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                    : "bg-black/40 text-zinc-400 border-[#1F2937] hover:border-zinc-700"
                }`}
              >
                {team.club} '{team.season.slice(2, 4)}
              </button>
            ))}
          </div>

          {selectedTeamDetails && (
            <div className="space-y-4 animate-fade-in bg-black/20 border border-[#1F2937] p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                   <h3 className="font-extrabold text-base text-white">{selectedTeamDetails.club}</h3>
                  <span className="text-xs text-zinc-500 font-mono">Temporada Lendária: {selectedTeamDetails.season}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500 block font-mono">TÉCNICO</span>
                  <span className="text-xs font-extrabold text-[#D4AF37]">{selectedTeamDetails.manager}</span>
                </div>
              </div>

              {/* Stat Indicators */}
              <div className="grid grid-cols-4 gap-2 text-center bg-black/40 p-2.5 rounded-lg border border-[#1F2937]">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">OVR</span>
                  <span className="text-sm font-black text-white">{selectedTeamDetails.overall}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">ATA</span>
                  <span className="text-sm font-black text-[#D4AF37]">{selectedTeamDetails.attack}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">MEI</span>
                  <span className="text-sm font-black text-[#2563EB]">{selectedTeamDetails.midfield}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">DEF</span>
                  <span className="text-sm font-black text-zinc-450">{selectedTeamDetails.defense}</span>
                </div>
              </div>

              {/* Real players list */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-zinc-400 block font-mono">ASTROS RECRUTÁVEIS PARA O DRAFT:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {selectedTeamDetails.players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-black/40 p-2 rounded border border-[#1F2937]">
                      <span className="text-xs text-zinc-300 font-medium truncate pr-2 max-w-[120px]">{p.name}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[9px] text-zinc-500 px-1 bg-zinc-90 w-7 text-center rounded">{p.position}</span>
                        <span className="text-xs text-[#D4AF37] font-extrabold">{p.overall}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules Information Accent Panel */}
      <section className="bg-[#1F2937]/30 border border-[#1F2937] rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg text-[#D4AF37]">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Draft por Posições</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              O sistema sorteia três clubes e temporadas históricas. Escolha exatamente um astro para preencher as onze posições do campo.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Respeite o Entrosamento</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Regras rígidas de recrutamento: no máximo 3 atletas do mesmo clube e no máximo 2 da mesma temporada. Pense bem nas conexões.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg text-[#D4AF37]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Fórmula UEFA Real</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              A simulação baseia-se em poder de ataque, meio, defesa, entrosamento, fator sorte e fator decisão ("Clutch") individuais.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
