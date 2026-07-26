/**
 * "Registro Avaliativo Individual para Encaminhamento" — ficha preenchida pelo
 * professor regente e usada para instruir o encaminhamento do estudante.
 *
 * Estrutura fiel ao documento oficial da rede. Fica como dado (não código) para
 * gerar o formulário e o PDF a partir da mesma fonte.
 */

export type Grupo = {
  id: string;
  titulo: string;
  /** Pergunta/enunciado do grupo, como no documento. */
  enunciado?: string;
  itens: string[];
  /** Campo de texto livre ao final do grupo. */
  outros?: boolean;
};

export type Secao = {
  id: string;
  titulo: string;
  grupos: Grupo[];
};

export const MOTIVOS_ENCAMINHAMENTO = [
  "Baixo Rendimento Escolar",
  "Problemas de Comportamento",
  "Problemas Emocionais",
  "Suspeita de Superdotação",
  "Dificuldades Auditivas",
  "Dificuldades Visuais",
  "Dificuldades Motoras",
  "Dificuldades de Linguagem",
];

/** Seções de checklist do documento. */
export const SECOES: Secao[] = [
  {
    id: "psicomotor",
    titulo: "Psicomotricidade",
    grupos: [
      {
        id: "espacial",
        titulo: "Estruturação espacial",
        enunciado: "O aluno tem dificuldade em distinguir:",
        itens: [
          "à frente / atrás",
          "perto / longe / ao lado",
          "para dentro / para fora",
          "último / primeiro",
          "acima / abaixo",
        ],
      },
      {
        id: "temporal",
        titulo: "Orientação temporal",
        enunciado: "O aluno tem dificuldade em distinguir:",
        itens: ["antes / depois", "hoje / ontem", "rápido / lento", "cedo / tarde", "dia / noite", "agora"],
      },
      {
        id: "tonus",
        titulo: "Tônus, postura e equilíbrio",
        enunciado: "O aluno:",
        itens: [
          "anda mal em linha reta",
          "tem defeito de postura (cabeça baixa, ombros para frente, corcunda)",
          "deixa cair objetos que segura",
          "tem dificuldade para apanhar pequenos objetos com polegar e indicador",
          "apresenta constantes movimentos involuntários (tiques e cacoetes)",
          "apresenta desleixo ao sentar e/ou ao andar",
          "o traçado da letra é excessivamente forte",
          "escreve fora da linha",
          "ao recortar sai do contorno do desenho",
          "o traçado da letra é excessivamente fraco",
        ],
      },
      {
        id: "fina",
        titulo: "Pré-escrita e coordenação dinâmica manual",
        enunciado: "O aluno apresenta dificuldade em:",
        itens: [
          "cobrir pontilhados",
          "empilhar objetos",
          "pintar",
          "desenhar",
          "recortar",
          "usar tesoura",
          "dar laços",
          "encaixar objetos",
          "copiar do quadro",
          "enfiar",
        ],
      },
    ],
  },
  {
    id: "cognicao",
    titulo: "Cognição: percepção e discriminação",
    grupos: [
      {
        id: "visual",
        titulo: "Percepção visual",
        enunciado: "O aluno tem dificuldade em discriminar:",
        itens: [
          "cores",
          "tamanhos",
          "quantidades",
          "formas",
          "direções",
          "semelhanças e diferenças",
          "tamanhos (grande, pequeno, maior, menor)",
        ],
      },
      {
        id: "mem_visual",
        titulo: "Memória visual",
        enunciado: "O aluno apresenta dificuldade em:",
        itens: [
          "compreender os estímulos visuais",
          "reter e evocar nomes de lugares, pessoas, objetos, figuras, frases, números",
          "reproduzir situações ocorridas (filmes, TV, situações reais)",
          "reproduzir desenhos",
        ],
      },
      {
        id: "dif_visual",
        titulo: "Sinais de dificuldade visual",
        itens: [
          "irritação crônica nos olhos (lacrimejantes, pálpebras avermelhadas ou inchadas)",
          "náuseas, visão dupla ou névoa durante/após a leitura",
          "tenta afastar com as mãos impedimentos visuais",
          "pestanejamento constante, principalmente durante a leitura",
          "esfrega os olhos, franze ou contrai o rosto ao olhar objetos distantes",
          "inquietação ou irritabilidade após trabalho visual prolongado",
          "inclina a cabeça para um lado durante a leitura",
          "cautela excessiva ao andar, tropeça sem razão aparente",
          "desatenção durante trabalhos no quadro e mapas de parede",
          "lê apenas por curtos períodos",
          "segura o livro muito perto/distante, ou fecha um olho ao ler",
        ],
      },
      {
        id: "auditiva",
        titulo: "Percepção auditiva",
        enunciado: "O aluno apresenta dificuldade em:",
        itens: ["distinguir sons vocais e não vocais", "reproduzir sons", "localizar a fonte sonora"],
      },
      {
        id: "mem_auditiva",
        titulo: "Memória auditiva",
        enunciado: "Dificuldade em reter e evocar:",
        itens: [
          "sons onomatopaicos",
          "ordens verbais",
          "letras de música",
          "notícias",
          "histórias",
          "trecho lido",
          "frases",
        ],
      },
      {
        id: "dif_auditiva",
        titulo: "Sinais de dificuldade auditiva",
        itens: [
          "pede sempre que o professor repita o que disse",
          "apresenta dor ou secreção no ouvido",
          "não atende quando solicitado",
          "não reage a sons pouco intensos fora do campo visual",
        ],
      },
      {
        id: "tatil",
        titulo: "Percepção tátil",
        enunciado: "Dificuldade em distinguir pelo tato:",
        itens: ["objetos", "formas", "tamanhos", "posição", "quantidades", "temperaturas", "texturas"],
      },
      {
        id: "atencao",
        titulo: "Atenção",
        enunciado: "O aluno:",
        itens: ["não controla a atenção", "é dispersivo", "é desatento, olhar distante"],
      },
      {
        id: "raciocinio",
        titulo: "Raciocínio",
        enunciado: "O aluno apresenta dificuldade em:",
        itens: [
          "resolver problemas simples",
          "resolver problemas complexos",
          "explicar uma situação",
          "realizar tarefas definidas",
          "tirar conclusões lógicas de determinadas situações",
          "fazer críticas",
        ],
      },
    ],
  },
  {
    id: "linguagem",
    titulo: "Linguagem",
    grupos: [
      {
        id: "fala",
        titulo: "Fala",
        itens: [
          "omite fonemas",
          "fala de forma incompreensível",
          "apresenta gagueira",
          "vocabulário aquém da idade",
          "fala muito rapidamente (sem clareza)",
        ],
      },
      {
        id: "leitura",
        titulo: "Leitura",
        enunciado: "Dificuldade em:",
        itens: [
          "identificar as vogais",
          "unir vogais",
          "troca letras",
          "ler palavras simples",
          "fazer leitura interpretativa",
          "respeitar pontuação",
          "inventar palavras",
          "saltar linha",
          "omitir fonemas",
          "trocar fonemas",
          "inverter fonemas",
          "lê soletrando palavras, frases ou textos",
          "mexe os lábios na leitura silenciosa",
          "não lê",
          "aproxima o rosto do texto",
        ],
      },
      {
        id: "escrita",
        titulo: "Escrita",
        enunciado: "Dificuldade em:",
        itens: [
          "escrever sobre a linha",
          "omite letras ou palavras",
          "acrescenta letras",
          "substitui letras visualmente semelhantes (u/v, e/l)",
          "troca letras auditivamente semelhantes (pato/bato)",
          "confunde letras de orientação simétrica (p/d, n/u)",
          "tremor no traçado",
          "direção do traçado",
          "escrita ilegível",
          "inconstância no tamanho da letra",
          "muita força muscular ao escrever",
          "pouca força muscular ao escrever",
          "dificuldade motora ao escrever",
          "identificar vogais",
          "unir vogais",
          "copiar palavras ou textos do quadro ou de livros",
        ],
        outros: true,
      },
    ],
  },
  {
    id: "comportamento",
    titulo: "Problemas de comportamento",
    grupos: [
      {
        id: "situacoes",
        titulo: "Situações em que ocorre indisciplina",
        itens: [
          "quando a tarefa é difícil",
          "quando a tarefa é oral",
          "quando vem aborrecido de casa",
          "quando alguém o agride",
          "quando agride alguém",
        ],
        outros: true,
      },
      {
        id: "conduta",
        titulo: "Conduta inadequada",
        itens: [
          "agressividade",
          "mentira",
          "furto",
          "exibicionismo",
          "apatia",
          "inquietação",
          "egoísmo",
          "hiperatividade",
          "rói unhas",
          "birra",
          "retraimento, fantasia excessiva",
        ],
      },
    ],
  },
  {
    id: "emocional",
    titulo: "Problemas emocionais",
    grupos: [
      {
        id: "emo",
        titulo: "Comportamentos observados",
        itens: [
          "carência afetiva",
          "choro fácil",
          "riso imotivado frequente",
          "fala excessivamente sobre suas dificuldades",
          "insegurança",
          "timidez excessiva",
          "isolamento",
        ],
        outros: true,
      },
    ],
  },
  {
    id: "ah_sd",
    titulo: "Altas habilidades / superdotação",
    grupos: [
      {
        id: "ah",
        titulo: "O aluno vem se destacando em",
        enunciado: "Marque os aspectos observados:",
        itens: [
          "Intelectual — flexibilidade e fluência de pensamento, rapidez de aprendizagem, pensamento abstrato, memória e compreensão elevadas",
          "Acadêmico — atenção, memória, motivação por tarefas acadêmicas, habilidades especiais em áreas específicas, desempenho excepcional",
          "Criativo — soluções inovadoras, originalidade, fluência, curiosidade, relações rápidas de causa e efeito",
          "Psicomotor — habilidade e interesse por atividades físicas, agilidade, força, coordenação",
          "Talento especial — artes plásticas, comunicação, relacionamento humano, música",
        ],
      },
    ],
  },
];

/** Campos descritivos ao final do documento (respondidos pelo professor). */
export const CAMPOS_DESCRITIVOS: { id: string; label: string; ajuda?: string }[] = [
  {
    id: "relacionamento",
    label: "Relacionamento do aluno com você e demais pessoas da escola",
  },
  { id: "pontos_positivos", label: "Pontos positivos do aluno" },
  { id: "outras_observacoes", label: "Outras observações sobre o aluno" },
  {
    id: "personalidade",
    label: "Aspectos de personalidade",
    ajuda: "agressividade, autonomia, interesse, insegurança, socialização, timidez, limites…",
  },
  {
    id: "academicos",
    label: "Aspectos acadêmicos",
    ajuda: "assimilação, expressão escrita e oral, leitura, interpretação, caligrafia…",
  },
  {
    id: "atitudinais",
    label: "Aspectos atitudinais",
    ajuda: "disciplina, organização, participação, assiduidade, motivação, responsabilidade…",
  },
  {
    id: "medidas",
    label: "Medidas educativas já adotadas",
    ajuda: "adaptação, trabalho em grupo, avaliação oral, conversa com os pais, encaminhamentos…",
  },
  {
    id: "familiar",
    label: "Contexto familiar",
    ajuda: "estruturação familiar, relacionamento, participação, convívio…",
  },
  {
    id: "dados_importantes",
    label: "Dados importantes",
    ajuda: "apoio pedagógico, acompanhamento psicológico/fono, repetência, saúde, medicamentos…",
  },
];

export const FREQUENCIA_INDISCIPLINA = ["sempre", "quase sempre", "às vezes"];

/** Conta itens marcados, para o resumo. */
export function contarMarcados(valores: Record<string, unknown>): number {
  return Object.entries(valores).filter(([k, v]) => k.startsWith("chk:") && v === true).length;
}

/** Chave de um item de checklist. */
export function chaveItem(secaoId: string, grupoId: string, indice: number): string {
  return `chk:${secaoId}.${grupoId}.${indice}`;
}
