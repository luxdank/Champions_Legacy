export interface LegendaryManager {
  id: string;
  name: string;
  specialty: string;
  boostDesc: string;
  boostType: "midfield" | "chemistry" | "defense" | "attack" | "clutch";
  desc: string;
  quote: string;
}

export const LEGENDARY_MANAGERS: LegendaryManager[] = [
  {
    id: "guardiola",
    name: "Pep Guardiola",
    specialty: "Tiki-Taka",
    boostDesc: "+3 de Meio-Campo no time",
    boostType: "midfield",
    desc: "O mestre da posse de bola e do domínio coletivo. Prioriza passes precisos e movimentação constante.",
    quote: "Se você tem o controle do meio-campo, você tem o controle do jogo."
  },
  {
    id: "ferguson",
    name: "Sir Alex Ferguson",
    specialty: "Fergie Time",
    boostDesc: "+3 no Fator Decisão (Clutch)",
    boostType: "clutch",
    desc: "A lenda máxima da liderança e perseverança. Conhecido por vitórias heróicas nos minutos finais.",
    quote: "Nunca desista. O jogo só acaba quando o árbitro apita o final."
  },
  {
    id: "ancelotti",
    name: "Carlo Ancelotti",
    specialty: "Gestão de Estrelas",
    boostDesc: "+5 de Entrosamento (Chemistry)",
    boostType: "chemistry",
    desc: "O maior vencedor da história da Champions League. Especialista em unir craques e extrair o seu melhor.",
    quote: "Futebol é sobre as pessoas, sobre gerenciar os rostos e corações do elenco."
  },
  {
    id: "mourinho",
    name: "José Mourinho",
    specialty: "Defesa de Aço",
    boostDesc: "+3 de Defesa no time",
    boostType: "defense",
    desc: "O tático implacável do contra-ataque e da dedicação defensiva máxima. Um especialista em finais.",
    quote: "Se você não sofrer gols, você está sempre mais perto da vitória."
  },
  {
    id: "klopp",
    name: "Jürgen Klopp",
    specialty: "Gegenpressing",
    boostDesc: "+3 de Ataque no time",
    boostType: "attack",
    desc: "Criador do futebol ‘heavy metal’. Pressão ultra-agressiva na saída do oponente e transições explosivas.",
    quote: "O melhor momento para recuperar a bola é imediatamente após a perda."
  },
  {
    id: "zidane",
    name: "Zinedine Zidane",
    specialty: "Mística das Finais",
    boostDesc: "+1.5 de Bônus em Todos os Setores",
    boostType: "clutch",
    desc: "Três títulos consecutivos de Champions. Ele traz uma calma inabalável e uma aura vencedora incomparável.",
    quote: "Nas finais, a calma sob pressão é o que separa os grandes dos imortais."
  }
];
