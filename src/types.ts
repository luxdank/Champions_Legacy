export type Formation = "4-3-3" | "4-4-2" | "4-2-3-1" | "3-5-2";

export interface Player {
  id: string;
  name: string;
  position: "GK" | "RB" | "CB" | "LB" | "CDM" | "CM" | "CAM" | "RM" | "LM" | "RW" | "LW" | "ST";
  overall: number;
  peak: number; // 0-10 rating of their max impact
  clutch: number; // 0-10 rating of big game impact
  clubs: string[]; // history of clubs (could just be the source club)
  year: string; // season (e.g. "2010-11")
}

export interface LegacyTeam {
  id: string;
  club: string;
  season: string;
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  chemistry: number;
  manager: string;
  logoUrl?: string;
  players: Player[];
}

export interface DraftSlot {
  index: number;
  position: Player["position"];
  draftedPlayer: Player | null;
  // Sorteio for this slot: club and season
  teamOptions: {
    team: LegacyTeam;
    playerOptions: Player[];
  }[];
}

export interface DraftState {
  formation: Formation | null;
  slots: DraftSlot[];
  activeSlotIndex: number | null;
  coachedBy: string;
  status: "setup" | "drafting" | "simulating" | "completed";
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "assist" | "save" | "error" | "card" | "penalty" | "shootout";
  player: string;
  assistant?: string;
  description: string;
  team: "home" | "away";
}

export interface SimulatedMatch {
  id: string;
  stage: "Oitavas" | "Quartas" | "Semifinal" | "Final";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  events: MatchEvent[];
  winner: string;
  loser: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  date: string;
  formation: Formation;
  ovr: number;
  chemistry: number;
  lineup: string[]; // List of player names
  champions: boolean; // Managed to win the UCL?
  trophiesCount: number; // 4 if won final, 3 if semis, 2 if quarters, 1 if R16
  narrative?: {
    champion: string;
    topScorer: string;
    bestPlayer: string;
    bestDefense: string;
    bestSigning: string;
    biggestBlunder: string;
    fullCommentary?: string;
  };
}

export interface User {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  isAnonymous: boolean;
}
