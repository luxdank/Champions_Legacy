# Champions Legacy — Prompt Master 🏆

Bem-vindo ao **Champions Legacy**, um jogo repleto de táticas esportivas e decisões estratégicas inspirado nas maiores lendas e elencos históricos da maior competição de clubes do planeta — a **UEFA Champions League**.

---

## 🎨 Identidade Visual & Conceito
- **Estilo**: Premium, Escuro, Esportivo, Moderno e Minimalista.
- **Paleta de CORES**:
  - Fundo Deep Charcoal: `#09090B`
  - Destaque Gold/Amber: `#D4AF37`
  - Destaque Blue/Royal: `#2563EB`
  - Bordas Grid/Chassis: `#1F2937`
- **Atmosfera**: Interface esportiva imersiva, com grid tático interativo de futebol, microanimações, tabelas de brackets atualizadas dinamicamente e crônicas jornalísticas guiadas por Inteligência Artificial.

---

## 🏗️ Stack de Tecnologia Utilizada
O projeto foi moldado seguindo uma arquitetura robusta e escalável **Full-Stack (Vite + Express)** perfeitamente integrada no container do Google AI Studio:
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, animações e layouts táticos modernos.
- **Backend (Express)**: Servidor Node que proxyifica requisições da API, persiste dados no disco via arquivos JSON estruturados, e gerencia as chamadas seguras da API do Gemini.
- **Inteligência Artificial**: **Gemini 2.5 Flash**, gerando crônicas esportivas e premiações hilárias sob medida para o time escalado pelo jogador.
- **Persistência**: Leaderboard integrada em `/api/leaderboard` mapeando pontuações em disco no arquivo `leaderboard.json`.

---

## ⚙️ Regras do Jogo & Draft

### 1. Escolha sua Tática (Passo 1):
Selecione um dos esquemas táticos mais vitoriosos da história europeia:
- **4-3-3**
- **4-4-2**
- **4-2-3-1**
- **3-5-2**

### 2. Recrute as Lendas (Passo 2):
Para cada posição no campo, o sistema sorteará aleatoriamente **3 opções de clubes e temporadas históricas** (como o *Barcelona 2010-11*, *Real Madrid 2016-17*, *Milan 1988-89*, etc). Você deve escolher exatamente **1 jogador** respeitando as restrições abaixo:
- **Máximo de 3 atletas do mesmo clube** no elenco final.
- **Máximo de 2 atletas da mesma temporada/ano** no elenco final.
- Elenco final obrigatoriamente com 11 jogadores.

### 3. A Simulação:
Simule as etapas em brackets mata-mata completas:
1. **Oitavas de Final**
2. **Quartas de Final**
3. **Semifinais**
4. **Grande Final**

A força do seu elenco é regida pela fórmula certificada pela UEFA:
$$\text{TeamPower} = (\text{OVR} \times 0.40) + (\text{Chemistry} \times 0.20) + (\text{Attack} \times 0.20) + (\text{Midfield} \times 0.10) + (\text{Defense} \times 0.10)$$

Com a incidência de:
- **Fator de Sorte Geral (RandomFactor)**: Multiplicador oscilando entre $0.85$ e $1.15$ por partida.
- **Bônus de Decisão (ClutchBonus)**: Variando de $0$ a $10$ baseado na média de estrelas "Clutch" do elenco escalado.
- **Momento da Equipe (Momentum)**: Variando de $0$ a $5$ baseado no histórico da campanha ativa.

---

## 📊 Estrutura de Modelagem de Dados

### 1. `historic_teams` (Equipes Históricas)
Representa os elencos base disponíveis para sorteio no Draft.
```typescript
interface LegacyTeam {
  id: string;
  club: string;
  season: string;
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  chemistry: number;
  manager: string;
  players: Player[];
}
```

### 2. `players` (Jogadores)
Representa os atletas lendas e suas valias em grandes jogos.
```typescript
interface Player {
  id: string;
  name: string;
  position: "GK" | "RB" | "CB" | "LB" | "CDM" | "CM" | "CAM" | "RM" | "LM" | "RW" | "LW" | "ST";
  overall: number;
  peak: number;    // Escala 0-10 impacto de auge
  clutch: number;  // Escala 0-10 poder decisivo
  year: string;    // Ex: "2010-11"
}
```

### 3. `team_players` (Relação e Escalações)
Mapeia os jogadores eleitos pelo treinador ativo.

---

## 🏆 Registre sua Liderança!
Após a simulação, obtenha suas avaliações de prêmio criadas pela IA e publique seu placar no Mural de Líderes Global! desafie seus companheiros compartilhando o card!

Divirta-se jogando o **Champions Legacy**! ⚽🔥
