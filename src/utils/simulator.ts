import { Formation, DraftSlot, Player, SimulatedMatch, MatchEvent, LegacyTeam } from "../types";
import { LEGACY_TEAMS, OTHER_OPPONENTS } from "../data/teams";

// Helper function to pick realistic goal scorer and assistant, strictly avoiding Goalkeepers (GK)
export function getScorerAndAssistant(
  playersList: Player[] | undefined,
  lineupNames: string[] | undefined
): { scorer: string; assistant?: string } {
  // If we have full player objects, select weighted by position
  if (playersList && playersList.length > 0) {
    // Filter out GK from normal scoring
    const outfieldPlayers = playersList.filter(p => p.position !== "GK");
    if (outfieldPlayers.length === 0) {
      // Emergency fallback if only GK exists
      const fallback = playersList[0]?.name || "Atacante";
      return { scorer: fallback };
    }
    
    // Assign weights based on position group
    const weightedPlayers: { player: Player; weight: number }[] = outfieldPlayers.map(p => {
      let weight = 1;
      if (["ST", "CF"].includes(p.position)) weight = 10;
      else if (["LW", "RW"].includes(p.position)) weight = 8;
      else if (["CAM", "LM", "RM"].includes(p.position)) weight = 6;
      else if (["CM"].includes(p.position)) weight = 4;
      else if (["CDM"].includes(p.position)) weight = 2;
      else if (["LB", "RB", "CB"].includes(p.position)) weight = 1;
      return { player: p, weight };
    });

    const totalWeight = weightedPlayers.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedPlayer = weightedPlayers[0].player;
    for (const item of weightedPlayers) {
      rand -= item.weight;
      if (rand <= 0) {
        selectedPlayer = item.player;
        break;
      }
    }

    // Select assistant from other outfield players
    const otherPlayers = outfieldPlayers.filter(p => p.id !== selectedPlayer.id);
    let assistant: string | undefined;
    if (otherPlayers.length > 0) {
      // Assist is also weighted towards midfield/wings
      const weightedAssists = otherPlayers.map(p => {
        let weight = 1;
        if (["CAM", "LW", "RW", "LM", "RM"].includes(p.position)) weight = 6;
        else if (["CM"].includes(p.position)) weight = 4;
        else if (["LB", "RB"].includes(p.position)) weight = 3;
        else if (["ST"].includes(p.position)) weight = 2;
        return { player: p, weight };
      });
      const totalAssistWeight = weightedAssists.reduce((sum, item) => sum + item.weight, 0);
      let assistRand = Math.random() * totalAssistWeight;
      for (const item of weightedAssists) {
        assistRand -= item.weight;
        if (assistRand <= 0) {
          assistant = item.player.name;
          break;
        }
      }
    }
    
    return { scorer: selectedPlayer.name, assistant };
  }

  // Fallback using names array
  const fallbackList = lineupNames && lineupNames.length > 0 ? lineupNames : ["Atacante", "Meio-Campo"];
  // Filter out any default "Goleiro", "GK", etc from fallback list if possible
  const cleanFallback = fallbackList.filter(name => {
    const n = name.toLowerCase();
    return !n.includes("goleiro") && !n.includes("gk") && !n.includes("gk") && !n.includes("gkeeper");
  });
  const chosenScorer = cleanFallback.length > 0 
    ? cleanFallback[Math.floor(Math.random() * cleanFallback.length)] 
    : fallbackList[Math.floor(Math.random() * fallbackList.length)];
  const assistants = cleanFallback.filter(n => n !== chosenScorer);
  const chosenAssistant = assistants.length > 0 ? assistants[Math.floor(Math.random() * assistants.length)] : undefined;
  
  return { scorer: chosenScorer, assistant: chosenAssistant };
}

// Function to calculate exact squad metrics from drafted slots
export function calculateSquadMetrics(slots: DraftSlot[], formation: Formation) {
  const players = slots.map(sol => sol.draftedPlayer).filter((p): p is Player => p !== null);
  
  if (players.length === 0) {
    return { overall: 60, attack: 60, midfield: 60, defense: 60, chemistry: 10 };
  }

  // OVR is average of drafted players' overall
  const overall = Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length);

  // Group by role to compute sector ratings
  const attackPositions = ["ST", "RW", "LW"];
  const midfieldPositions = ["CM", "CDM", "CAM", "RM", "LM"];
  const defensePositions = ["CB", "LB", "RB", "GK"];

  const attackPlayers = players.filter(p => attackPositions.includes(p.position));
  const midfieldPlayers = players.filter(p => midfieldPositions.includes(p.position));
  const defensePlayers = players.filter(p => defensePositions.includes(p.position));

  const attack = attackPlayers.length > 0 
    ? Math.round(attackPlayers.reduce((sum, p) => sum + p.overall, 0) / attackPlayers.length)
    : overall - 3;

  const midfield = midfieldPlayers.length > 0
    ? Math.round(midfieldPlayers.reduce((sum, p) => sum + p.overall, 0) / midfieldPlayers.length)
    : overall - 2;

  const defense = defensePlayers.length > 0
    ? Math.round(defensePlayers.reduce((sum, p) => sum + p.overall, 0) / defensePlayers.length)
    : overall - 4;

  // CHEMISTRY recalculation logic
  // Base chemistry starts at 40
  // Add +4 for each club connection (players from the same club)
  // Add +5 for each season connection (players from the same season/year)
  // Max chemistry is 100
  let chemistry = 40;

  const clubCounts: { [key: string]: number } = {};
  const seasonCounts: { [key: string]: number } = {};

  players.forEach(p => {
    p.clubs.forEach(club => {
      clubCounts[club] = (clubCounts[club] || 0) + 1;
    });
    seasonCounts[p.year] = (seasonCounts[p.year] || 0) + 1;
  });

  // Calculate chemistry from club connections
  Object.values(clubCounts).forEach(count => {
    if (count > 1) {
      chemistry += (count - 1) * 8; // e.g. 3 players from same club of original team adds +16
    }
  });

  // Calculate chemistry from season connections
  Object.values(seasonCounts).forEach(count => {
    if (count > 1) {
      chemistry += (count - 1) * 10; // e.g. 2 players from same season adds +10
    }
  });

  // Bound chemistry between 10 and 100
  chemistry = Math.max(10, Math.min(100, chemistry));

  return { overall, attack, midfield, defense, chemistry };
}

// Map of names to pull when need random team player options
export function getRandomOpponents(count: number): any[] {
  // Shuffles OTHER_OPPONENTS list and returns first N
  const shuffled = [...OTHER_OPPONENTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// High stakes Champions League simulation algorithm
export function simulateMatchPlay(
  stage: SimulatedMatch["stage"],
  userTeam: { name: string; overall: number; attack: number; midfield: number; defense: number; chemistry: number; lineup?: string[]; manager: string; players?: Player[] },
  opponent: { id: string; name: string; overall: number; attack: number; midfield: number; defense: number; chemistry: number; manager: string; players?: Player[] },
  momentum: number // 0 to 5
): SimulatedMatch {
  const isUserHome = Math.random() > 0.5;
  const homeName = isUserHome ? userTeam.name : opponent.name;
  const awayName = isUserHome ? opponent.name : userTeam.name;

  // Calculate base power
  // TeamPower = ( OVR * 0.40 + Chemistry * 0.20 + Attack * 0.20 + Midfield * 0.10 + Defense * 0.10 )
  const calculatePower = (t: { overall: number; chemistry: number; attack: number; midfield: number; defense: number }) => {
    return t.overall * 0.40 + t.chemistry * 0.20 + t.attack * 0.20 + t.midfield * 0.10 + t.defense * 0.10;
  };

  const userBasePower = calculatePower(userTeam);
  const opponentBasePower = calculatePower(opponent);

  // Random factors
  const userRandom = 0.85 + Math.random() * 0.30; // 0.85 to 1.15
  const opponentRandom = 0.85 + Math.random() * 0.30;

  // Clutch bonus (0 to 10 based on ratings)
  const userClutch = Math.floor(Math.random() * 5) + (userTeam.overall > 90 ? 4 : 2);
  const opponentClutch = Math.floor(Math.random() * 5) + (opponent.overall > 90 ? 4 : 2);

  // Calculate final team powers
  const userFinalPower = userBasePower * userRandom + userClutch + momentum;
  const opponentFinalPower = opponentBasePower * opponentRandom + opponentClutch;

  const homePower = isUserHome ? userFinalPower : opponentFinalPower;
  const awayPower = isUserHome ? opponentFinalPower : userFinalPower;

  // Goals calculation - baseline ~ 0 to 3 goals (deixe mais junto)
  // Power differences drive the scores gently
  const powerDiff = homePower - awayPower;
  
  let homeGoalsBase = 0.8 + (powerDiff / 18) + (Math.random() * 1.5);
  let awayGoalsBase = 0.8 - (powerDiff / 18) + (Math.random() * 1.5);

  let homeGoals = Math.max(0, Math.floor(homeGoalsBase));
  let awayGoals = Math.max(0, Math.floor(awayGoalsBase));

  // Cap goals at 4 under normal 90 mins to ensure real tight scorelines
  homeGoals = Math.min(4, homeGoals);
  awayGoals = Math.min(4, awayGoals);

  // Force tighter difference sometimes (deixe mais junto)
  if (Math.abs(homeGoals - awayGoals) > 2) {
    if (Math.random() > 0.4) {
      if (homeGoals > awayGoals) {
        homeGoals--;
      } else {
        awayGoals--;
      }
    }
  }

  // Ensure logical simulation events
  const events: MatchEvent[] = [];
  
  // Extract GK names
  const userGkName = userTeam.players?.find(p => p.position === "GK")?.name || 
                     userTeam.lineup?.find((_, idx) => idx === 0) || "Goleiro";
  const opGK = opponent.players?.find(p => p.position === "GK")?.name || "Goleiro Adversário";

  // Helpers to get scorer and assistant (without GK)
  const getUserScorer = () => getScorerAndAssistant(userTeam.players, userTeam.lineup);
  const getOpScorer = () => getScorerAndAssistant(opponent.players, opponent.players?.map(p => p.name));

  // Build key events during 90 minutes
  let currentHomeGoals = 0;
  let currentAwayGoals = 0;

  const matchMinutes = [12, 24, 38, 45, 54, 68, 77, 89].sort(() => 0.5 - Math.random());

  // Distribute goals & dramatic events
  for (let i = 0; i < homeGoals; i++) {
    const minute = matchMinutes[i % matchMinutes.length] || Math.floor(Math.random() * 40) + 45;
    const { scorer, assistant } = isUserHome ? getUserScorer() : getOpScorer();

    events.push({
      minute,
      type: "goal",
      player: scorer,
      assistant: assistant || undefined,
      description: `GOL! Ótima jogada coletiva. ${scorer} finaliza firme de dentro da área com assistência de ${assistant || "um belo passe de curva"}!`,
      team: "home"
    });
    currentHomeGoals++;
  }

  for (let i = 0; i < awayGoals; i++) {
    const minute = matchMinutes[(i + 3) % matchMinutes.length] || Math.floor(Math.random() * 40) + 45;
    const { scorer, assistant } = isUserHome ? getOpScorer() : getUserScorer();

    events.push({
      minute,
      type: "goal",
      player: scorer,
      assistant: assistant || undefined,
      description: `GOL! Que categoria! ${scorer} desvia tirando do goleiro após cruzamento perfeito de ${assistant || "bola parada"}!`,
      team: "away"
    });
    currentAwayGoals++;
  }

  // Add non-goal details: saves, errors, cards
  const defenseSaves = Math.floor(2 + Math.random() * 3);
  for (let i = 0; i < defenseSaves; i++) {
    const minute = Math.floor(Math.random() * 88) + 1;
    const saveTeam = Math.random() > 0.5 ? "home" : "away";
    const gkName = saveTeam === "home" ? (isUserHome ? userGkName : opGK) : (isUserHome ? opGK : userGkName);
    
    // Determine shooter
    const testPlayers = saveTeam === "home"
      ? (isUserHome ? opponent.players : userTeam.players)
      : (isUserHome ? userTeam.players : opponent.players);
    const testLineup = saveTeam === "home"
      ? (isUserHome ? undefined : userTeam.lineup)
      : (isUserHome ? userTeam.lineup : undefined);
      
    const shooter = getScorerAndAssistant(testPlayers, testLineup).scorer;

    events.push({
      minute,
      type: "save",
      player: gkName,
      description: `DEFESAÇA! ${gkName} se estica inteirinho para espalmar o chute de cobertura espetacular feito por ${shooter}!`,
      team: saveTeam
    });
  }

  // Blunder event
  if (Math.random() > 0.4) {
    const minute = Math.floor(Math.random() * 75) + 10;
    const errorTeam = Math.random() > 0.5 ? "home" : "away";
    
    const errPlayers = errorTeam === "home"
      ? (isUserHome ? userTeam.players : opponent.players)
      : (isUserHome ? opponent.players : userTeam.players);
    const errLineup = errorTeam === "home"
      ? (isUserHome ? userTeam.lineup : undefined)
      : (isUserHome ? undefined : userTeam.lineup);

    let defender = "Defensor";
    if (errPlayers && errPlayers.length > 0) {
      const matchDefenders = errPlayers.filter(p => ["CB", "LB", "RB", "CDM"].includes(p.position));
      if (matchDefenders.length > 0) {
        defender = matchDefenders[Math.floor(Math.random() * matchDefenders.length)].name;
      } else {
        const outfield = errPlayers.filter(p => p.position !== "GK");
        defender = outfield.length > 0 
          ? outfield[Math.floor(Math.random() * outfield.length)].name 
          : errPlayers[Math.floor(Math.random() * errPlayers.length)].name;
      }
    } else if (errLineup && errLineup.length > 0) {
      const cleanFallback = errLineup.filter(name => {
        const n = name.toLowerCase();
        return !n.includes("goleiro") && !n.includes("gk") && !n.includes("gkeeper");
      });
      defender = cleanFallback.length > 0 
        ? cleanFallback[Math.floor(Math.random() * cleanFallback.length)] 
        : errLineup[Math.floor(Math.random() * errLineup.length)];
    }

    events.push({
      minute,
      type: "error",
      player: defender,
      description: `ERRO GRAVE! ${defender} vacila feio na saída de bola, perde o controle e entrega nos pés da marcação sob enorme pressão da torcida!`,
      team: errorTeam
    });
  }

  // Sorting events by minute originally
  events.sort((a, b) => a.minute - b.minute);

  // Extra time simulation if knockout matches are tied
  let isDrawIn90 = currentHomeGoals === currentAwayGoals;
  let homePenalties: number | undefined;
  let awayPenalties: number | undefined;

  if (isDrawIn90) {
    // Stage requires a clear winner (Oitavas, Quartas, Semis, Final)
    // Dynamic simulation for Extra Time
    const homeEtGoals = Math.random() > 0.82 ? 1 : 0;
    const awayEtGoals = Math.random() > 0.82 ? 1 : 0;

    if (homeEtGoals > 0) {
      const { scorer } = isUserHome ? getUserScorer() : getOpScorer();
      events.push({
        minute: 104,
        type: "goal",
        player: scorer,
        description: `⚽ PRORROGAÇÃO! ${scorer} desempata a partida com um voleio brilhante na gaveta!`,
        team: "home"
      });
      currentHomeGoals++;
    }

    if (awayEtGoals > 0 && homeEtGoals === 0) { // Keep extra time tight as well
      const { scorer } = isUserHome ? getOpScorer() : getUserScorer();
      events.push({
        minute: 116,
        type: "goal",
        player: scorer,
        description: `⚽ PRORROGAÇÃO! Silêncio na arena, ${scorer} consegue igualizar com chute fulminante vencendo a defesa!`,
        team: "away"
      });
      currentAwayGoals++;
    }

    // Still draw? Let's simulate penalty shootout!
    if (currentHomeGoals === currentAwayGoals) {
      events.push({
        minute: 120,
        type: "penalty",
        player: "Árbitro",
        description: `FIM DA PRORROGAÇÃO! O placar segue empatado em ${currentHomeGoals}-${currentAwayGoals}. Preparem os seus corações, a partida será decidida na DISPUTA DE PÊNALTIS!`,
        team: "home"
      });

      // Shootout simulation
      let homeScorePen = 0;
      let awayScorePen = 0;
      let round = 1;

      // Simulate a series of penalties
      while (round <= 5 || (homeScorePen === awayScorePen)) {
        const homeInObj = Math.random() > 0.28; // penalty success rate ~72%
        const awayInObj = Math.random() > 0.28;

        if (homeInObj) homeScorePen++;
        if (awayInObj) awayScorePen++;

        events.push({
          minute: 120 + round,
          type: "shootout",
          player: `Rodada ${round}`,
          description: `Cobrança ${round}: ${homeName} [${homeInObj ? "✅ Convertido" : "❌ Perdeu"}] | ${awayName} [${awayInObj ? "✅ Convertido" : "❌ Perdeu"}]`,
          team: "home"
        });

        // Break early if mathematically decided after round 3
        if (round >= 5 && homeScorePen !== awayScorePen) {
          break;
        }
        round++;
      }

      homePenalties = homeScorePen;
      awayPenalties = awayScorePen;
    }
  }

  // Resolve winner and loser
  let isUserWinner = false;
  if (homePenalties !== undefined && awayPenalties !== undefined) {
    if (isUserHome) {
      isUserWinner = homePenalties > awayPenalties;
    } else {
      isUserWinner = awayPenalties > homePenalties;
    }
  } else {
    if (isUserHome) {
      isUserWinner = currentHomeGoals > currentAwayGoals;
    } else {
      isUserWinner = currentAwayGoals > currentHomeGoals;
    }
  }

  const winner = isUserWinner ? userTeam.name : opponent.name;
  const loser = isUserWinner ? opponent.name : userTeam.name;

  return {
    id: `match_${stage}_${Math.floor(Math.random() * 100000)}`,
    stage,
    homeTeam: homeName,
    awayTeam: awayName,
    homeScore: currentHomeGoals,
    awayScore: currentAwayGoals,
    homePenalties,
    awayPenalties,
    events,
    winner,
    loser
  };
}
