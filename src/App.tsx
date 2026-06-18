import { useState, useEffect } from "react";
import { Trophy, ShieldAlert, Sparkles, User, Globe, HelpCircle } from "lucide-react";
import { Formation, DraftSlot, SimulatedMatch, LeaderboardEntry } from "./types";
import LandingView from "./components/LandingView";
import DraftView from "./components/DraftView";
import SimulationView from "./components/SimulationView";
import NarrativeView from "./components/NarrativeView";

export default function App() {
  // 1. Navigation & Campaign States
  const [activeView, setActiveView] = useState<"landing" | "draft" | "simulation" | "completed">("landing");
  const [playerName, setPlayerName] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("guardiola");
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [draftedSlots, setDraftedSlots] = useState<DraftSlot[]>([]);
  const [simulatedMatches, setSimulatedMatches] = useState<SimulatedMatch[]>([]);
  const [wonTournament, setWonTournament] = useState<boolean>(false);

  // Leaderboard data state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isServerLive, setIsServerLive] = useState<boolean>(true);

  // Fetch Leaderboard from persistent backend on mount and after submission
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeaderboard(data);
        } else {
          throw new Error("Dados não são uma lista válida");
        }
        setIsServerLive(true);
      } else {
        throw new Error("Erro de resposta da API");
      }
    } catch (err) {
      console.warn("Servidor inativo ou offline. Usando memória local fallback:", err);
      setIsServerLive(false);
      // Fallback local persistence if server has a brief restart lag
      const localData = localStorage.getItem("champions_legacy_leaderboard");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            setLeaderboard(parsed);
          }
        } catch (_) {}
      }
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeView]);

  // 2. User Actions Transitions
  const handleStartDraft = (coachName: string, selectedManagerId: string) => {
    setPlayerName(coachName);
    setManagerId(selectedManagerId);
    setActiveView("draft");
  };

  const handleDraftComplete = (formation: Formation, slots: DraftSlot[]) => {
    setSelectedFormation(formation);
    setDraftedSlots(slots);
    setActiveView("simulation");
  };

  const handleSimulationComplete = (matches: SimulatedMatch[], won: boolean) => {
    setSimulatedMatches(matches);
    setWonTournament(won);
    setActiveView("completed");
  };

  const handleRestartCampaign = () => {
    setSelectedFormation(null);
    setDraftedSlots([]);
    setSimulatedMatches([]);
    setWonTournament(false);
    setManagerId("guardiola");
    setActiveView("landing");
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FFFFFF] font-sans antialiased flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      
      {/* GLOW DECORATIVE BLUR BACKGROUNDS */}
      <div className="fixed top-0 left-1/4 w-[400px] h-[400px] bg-blue-600/3 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2 z-0" />

      {/* CORE TOP NAVIGATION */}
      <header className="border-b border-[#1F2937] bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Brand logo container */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleRestartCampaign}>
            <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center text-black font-black text-base shadow shadow-[#D4AF37]/20">
              <div className="w-4 h-4 border-2 border-black rotate-45"></div>
            </div>
            <div>
              <span className="font-black font-display text-sm tracking-widest text-[#D4AF37] uppercase block leading-none">
                CHAMPIONS
              </span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-400 block mt-0.5 leading-none">
                LEGACY
              </span>
            </div>
          </div>

          {/* Status identity bar */}
          <div className="flex items-center gap-4">
            {playerName && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#1F2937]/30 border border-[#1F2937] rounded-full text-xs text-zinc-300 font-mono">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Coach: <strong className="text-white">{playerName}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] uppercase font-mono text-zinc-500 hidden sm:inline">
                {isServerLive ? "Server Live" : "Backup Live"}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* RENDER ACTIVE ROUTER SHEET CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 flex-1 w-full z-10">
        
        {activeView === "landing" && (
          <LandingView
            onStartDraft={handleStartDraft}
            leaderboard={leaderboard}
          />
        )}

        {activeView === "draft" && (
          <DraftView
            playerName={playerName}
            onDraftComplete={handleDraftComplete}
            onCancel={handleRestartCampaign}
          />
        )}

        {activeView === "simulation" && selectedFormation && (
          <SimulationView
            formation={selectedFormation}
            slots={draftedSlots}
            playerName={playerName}
            managerId={managerId}
            onSimulationComplete={handleSimulationComplete}
          />
        )}

        {activeView === "completed" && selectedFormation && (
          <NarrativeView
            formation={selectedFormation}
            slots={draftedSlots}
            playerName={playerName}
            managerId={managerId}
            matches={simulatedMatches}
            wonTournament={wonTournament}
            onRestart={handleRestartCampaign}
          />
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-[#1F2937] bg-black/40 py-6 text-center text-zinc-650 text-[10px] font-mono z-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Champions Legacy. Todos os direitos reservados. Projeto acadêmico para fins demonstrativos.</p>
          <div className="flex gap-4">
            <a href="#rules" className="hover:text-zinc-400 font-bold transition-colors uppercase">REGRAS</a>
            <span>•</span>
            <a href="#stats" className="hover:text-zinc-400 font-bold transition-colors uppercase">ESTATÍSTICAS</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
