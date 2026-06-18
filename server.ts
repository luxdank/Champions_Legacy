import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const LEADERBOARD_FILE = path.join(process.cwd(), "leaderboard.json");

app.use(express.json());

// Initialize leaderboard file if it does not exist
if (!fs.existsSync(LEADERBOARD_FILE)) {
  try {
    fs.writeFileSync(
      LEADERBOARD_FILE,
      JSON.stringify(
        [
          {
            id: "seed_1",
            playerName: "Erick Sacchi",
            score: 950,
            date: "2026-06-12",
            formation: "4-3-3",
            ovr: 96,
            chemistry: 98,
            lineup: ["Víctor Valdés", "Dani Alves", "Carles Puyol", "Gerard Piqué", "Éric Abidal", "Sergio Busquets", "Xavi Hernández", "Andrés Iniesta", "Lionel Messi", "David Villa", "Pedro Rodríguez"],
            champions: true,
            trophiesCount: 4,
            narrative: {
              champion: "Barcelona 2010-11 Core",
              topScorer: "Lionel Messi (9 gols)",
              bestPlayer: "Andrés Iniesta",
              bestDefense: "Maldini & Baresi Duo",
              bestSigning: "Lionel Messi",
              biggestBlunder: "Ninguém",
              fullCommentary: "Uma dinastia lendária consagrada nos maiores palcos da Europa! O Erick Sacchi liderou uma campanha impecável dominando as ações do início ao fim."
            }
          },
          {
            id: "seed_2",
            playerName: "Sofia Galática",
            score: 830,
            date: "2026-06-14",
            formation: "4-2-3-1",
            ovr: 95,
            chemistry: 92,
            lineup: ["Keylor Navas", "Wes Brown", "Sergio Ramos", "Nemanja Vidić", "Marcelo", "Casemiro", "Luka Modrić", "Thomas Müller", "Gareth Bale", "Cristiano Ronaldo", "Karim Benzema"],
            champions: true,
            trophiesCount: 4,
            narrative: {
              champion: "Real Madrid 2016-17",
              topScorer: "Cristiano Ronaldo (7 gols)",
              bestPlayer: "Sergio Ramos",
              bestDefense: "Vidić & Ramos",
              bestSigning: "Cristiano Ronaldo",
              biggestBlunder: "Wes Brown",
              fullCommentary: "Uma jornada repleta de reviravoltas e poder de decisão cirúrgico de Cristiano Ronaldo!"
            }
          },
          {
            id: "seed_3",
            playerName: "Diego El Pibe",
            score: 540,
            date: "2026-06-15",
            formation: "3-5-2",
            ovr: 91,
            chemistry: 88,
            lineup: ["Edwin van der Sar", "Matthias Sammer", "Jürgen Kohler", "Danny Blind", "Marc Overmars", "Javier Zanetti", "Frank Rijkaard", "Wesley Sneijder", "Roberto Donadoni", "Diego Milito", "Patrick Kluivert"],
            champions: false,
            trophiesCount: 2,
            narrative: {
              champion: "Real Madrid 2017-18",
              topScorer: "Diego Milito (4 gols)",
              bestPlayer: "Wesley Sneijder",
              bestDefense: "Matthias Sammer",
              bestSigning: "Diego Milito",
              biggestBlunder: "Danny Blind",
              fullCommentary: "A queda nas Quartas de Final deixou um gosto amargo. Faltou entrosamento em momentos críticos contra uma zaga impecável."
            }
          }
        ],
        null,
        2
      )
    );
  } catch (err) {
    console.error("Erro ao iniciar arquivo do ranking:", err);
  }
}

// ------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Fetch Leaderboard
app.get("/api/leaderboard", (req, res) => {
  try {
    const data = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
    const leaderboard = JSON.parse(data);
    // Sort descending by score
    leaderboard.sort((a: any, b: any) => b.score - a.score);
    res.json(leaderboard);
  } catch (err) {
    console.error("Erro ao ler leaderboard:", err);
    res.status(500).json({ error: "Erro ao ler dados do ranking" });
  }
});

// 3. Save Leaderboard Entry
app.post("/api/leaderboard", (req, res) => {
  try {
    const newEntry = req.body;
    if (!newEntry.playerName || !newEntry.formation) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const data = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
    const leaderboard = JSON.parse(data);

    const entryToSave = {
      id: `entry_${Date.now()}`,
      playerName: newEntry.playerName,
      score: newEntry.score || 0,
      date: new Date().toISOString().split("T")[0],
      formation: newEntry.formation,
      ovr: newEntry.ovr || 70,
      chemistry: newEntry.chemistry || 50,
      lineup: newEntry.lineup || [],
      champions: !!newEntry.champions,
      trophiesCount: newEntry.trophiesCount || 1,
      narrative: newEntry.narrative || {
        champion: newEntry.champions ? "Seu Time" : "Adversário",
        topScorer: "Não registrado",
        bestPlayer: "Não registrado",
        bestDefense: "Muralha de Berlim",
        bestSigning: "Não registrado",
        biggestBlunder: "Nenhum"
      }
    };

    leaderboard.push(entryToSave);
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));

    res.json({ status: "success", entry: entryToSave });
  } catch (err) {
    console.error("Erro ao salvar no ranking:", err);
    res.status(500).json({ error: "Erro ao salvar dados do ranking" });
  }
});

// 4. Generate AI Narrative or Fallback
app.post("/api/generate-narrative", async (req, res) => {
  const { matches, lineup, formation, coaching, ovr, chemistry, wonTournament } = req.body;

  if (!lineup || lineup.length === 0) {
    return res.status(400).json({ error: "Escalação inválida" });
  }

  // Witty, fallback sports journalism narrative generator
  const lastMatch = matches && matches.length > 0 ? matches[matches.length - 1] : null;
  const championTeam = wonTournament ? "Seu Time" : (lastMatch ? lastMatch.winner : "Adversário");
  
  // Choose key performers from user's actual lineup
  const topScorer = lineup[Math.floor(Math.random() * Math.min(lineup.length, 3))] || lineup[0];
  const bestPlayer = lineup[lineup.length > 2 ? 1 : 0];
  const worstPlayer = lineup[lineup.length - 1] || lineup[0];
  const defenseLeader = lineup.find((name: string, i: number) => i === 2 || i === 3) || lineup[0];

  // Fallback programmatic details
  const fallbackNarrative = {
    champion: championTeam,
    topScorer: `${topScorer} (7 gols)`,
    bestPlayer: bestPlayer,
    bestDefense: `Muralha organizada por ${defenseLeader}`,
    bestSigning: topScorer,
    biggestBlunder: `${worstPlayer} (Cartão Vermelho descuidado ou falha na zaga)`,
    fullCommentary: wonTournament
      ? `Histórico! Sob as ordens táticas de ${coaching}, a equipe montada sob a formação ${formation} (OVR ${ovr}) surpreendeu a Europa inteira! O grande destaque técnico foi ${bestPlayer}, que regeu o meio-campo como poucos, enquanto ${topScorer} consagrou-se como o artilheiro implacável do torneio. Deixaram o nome gravado no troféu mais cobiçado do futebol mundial.`
      : `Fim do sonho! A seleção de estrelas comandada por ${coaching} esbarrou na força coletiva do ${championTeam}. Apesar das exibições fantásticas de ${bestPlayer}, um erro catastrófico cometida por ${worstPlayer} minou as chances de triunfo. Fica a lição e a promessa de reestruturação para a próxima campanha histórica.`
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.log("GEMINI_API_KEY não definida ou padrão. Usando narrativa fallback.");
    return res.json(fallbackNarrative);
  }

  try {
    // Elegant Server-Side Gemini Call with telemetry headers
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Você é um jornalista esportivo renomado, sarcástico e apaixonado da UEFA Champions League.
Analise os resultados do nosso torneio simulado "Champions Legacy" e crie uma resenha esportiva memorável em PORTUGUÊS.

DADOS DA CAMPANHA:
- Treinador: ${coaching}
- Formação: ${formation}
- Classificação Geral (OVR): ${ovr}
- Entrosamento (Chemistry): ${chemistry}
- Elenco (Lineup): ${lineup.join(", ")}
- Campeão Final do Torneio: ${championTeam}
- O usuário venceu o campeonato? ${wonTournament ? "SIM" : "NÃO"}
- Partidas disputadas listadas em ordem cronológica com placares:
${JSON.stringify((matches || []).map((m: any) => ({ etapa: m.stage, jogo: `${m.homeTeam} ${m.homeScore} x ${m.awayScore} ${m.awayTeam}` })), null, 2)}

Sua resposta DEVE ser um objeto JSON válido (apenas o JSON bruto, sem tags markdown do tipo \`\`\`json) contendo exatamente as seguintes chaves em português:
- champion: Quem levantou a taça (nome do clube)
- topScorer: Nome do artilheiro (escolha um jogador real do elenco do usuário se venceu, ou destaque as estatísticas)
- bestPlayer: Melhor jogador do torneio (destaque um astro do time do usuário que brilhou)
- bestDefense: Melhor setor defensivo ou jogador de zaga
- bestSigning: A maior contratação ou cereja do bolo do elenco montado
- biggestBlunder: O pior jogador, o maior erro ou a gafe memorável (seja humorado sobre isso!)
- fullCommentary: Uma crônica esportiva de 3 a 5 linhas narrando de forma épiça, emocionante mas divertida o destino da equipe.

ATENÇÃO REGRA DE ULTRA VELOCIDADE:
Mantenha cada um dos valores acima extremamente curto (máximo de 3 palavras para nomes/fatores), e o 'fullCommentary' curto (máximo 40 palavras). Responda de forma extremamente direta e rápida para processamento instantâneo.

Gere apenas o objeto JSON plano.`;

    // Resilient model calling function with exponential backoff and model swapping
    const callModelWithFallback = async (attempt = 1): Promise<string> => {
      const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      const currentModel = models[Math.min(attempt - 1, models.length - 1)];
      try {
        console.log(`[Gemini API] Iniciando chamada com ${currentModel} (tentativa ${attempt}/4)...`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 250,
            temperature: 0.5,
          },
        });
        return response.text || "";
      } catch (err: any) {
        console.warn(`[Gemini API Warning] Falha na tentativa ${attempt} usando o modelo ${currentModel}:`, err.message || err);
        if (attempt < 4) {
          const delay = attempt * 1000;
          console.log(`[Gemini API] Aguardando ${delay}ms para tentar novamente...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return callModelWithFallback(attempt + 1);
        }
        throw err;
      }
    };

    const responseText = await callModelWithFallback();
    
    // Clean JSON formatting to handle accidental markdown responses safely
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```(?:json)?\n/, "");
    }
    if (cleanedJson.endsWith("```")) {
      cleanedJson = cleanedJson.replace(/```$/, "");
    }
    cleanedJson = cleanedJson.trim();

    const parsedNarrative = JSON.parse(cleanedJson);
    return res.json(parsedNarrative);

  } catch (error) {
    console.error("Erro ao chamar o modelo Gemini. Usando fallback narrativo:", error);
    return res.json(fallbackNarrative);
  }
});

// ------------------------------------------------------------------
// VITE CLIENT INTEGRATION
// ------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Champions Legacy Backend] Rodando em http://localhost:${PORT}`);
  });
}

startServer();
