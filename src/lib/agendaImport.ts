/**
 * Leitura das agendas de atendimento em `.docx` (formato CEAP) e `.csv`.
 *
 * O `.docx` real tem: cabeçalho com "Data: dd/mm/aaaa" e "Dia da semana", e
 * duas tabelas (MATUTINO / VESPERTINO) com as colunas
 * `HORÁRIO | NOME COMPLETO | P/F | CONTATO | SESSÕES | ESCOLA | RESPONSÁVEL`.
 * Linhas sem nome são horários livres e são ignoradas.
 *
 * O arquivo original nunca é modificado — lemos apenas os bytes.
 */
import { unzipSync } from "fflate";
import { normalizeTime } from "./agendaTime";

export type LinhaAgenda = {
  /** Índice da linha na origem, para rastreabilidade. */
  row: number;
  horario: string;
  nome: string;
  contato?: string;
  escola?: string;
  responsavel?: string;
  periodo?: string;
  presenca?: string;
};

export type AgendaLida = {
  data?: string;
  diaSemana?: string;
  profissional?: string;
  linhas: LinhaAgenda[];
  /** Linhas descartadas (horário livre, cabeçalho repetido…). */
  ignoradas: number;
};

function base64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function limpaXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** "23/06/2026" → "2026-06-23". Aceita ano com 2 ou 4 dígitos. */
export function dataBRparaISO(txt: string): string | undefined {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(txt ?? "");
  if (!m) return undefined;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

const CABECALHOS = ["horário", "horario", "nome completo", "p/f", "contato", "sessões", "escola"];

function ehCabecalho(celulas: string[]): boolean {
  const primeira = (celulas[0] ?? "").toLowerCase();
  return CABECALHOS.includes(primeira);
}

/** Lê a agenda de um `.docx` (bytes já decodificados). */
export function lerAgendaDocx(bytes: Uint8Array): AgendaLida {
  const zip = unzipSync(bytes);
  const doc = zip["word/document.xml"];
  if (!doc) throw new Error("Documento .docx inválido (sem word/document.xml).");
  const xml = new TextDecoder("utf-8").decode(doc);

  const textoTodo = limpaXml(xml);
  const data = dataBRparaISO(/Data:\s*([\d/]+)/i.exec(textoTodo)?.[1] ?? "");
  // O texto do cabeçalho vem colado ao da tabela ("TERÇA-FEIRAMATUTINOHORÁRIO…"),
  // então recortamos no primeiro marcador conhecido.
  const diaSemana = /semana:\s*([A-Za-zÀ-ú]+(?:-FEIRA)?)/i
    .exec(textoTodo)?.[1]
    ?.replace(/(MATUTINO|VESPERTINO|HOR[ÁA]RIO).*$/i, "")
    .trim();
  const profissional = /Profissional:\s*([A-ZÀ-Ú][A-ZÀ-Ú\s.]+?)(?:\s{2,}|Data:)/i
    .exec(textoTodo)?.[1]
    ?.trim();

  const linhas: LinhaAgenda[] = [];
  let ignoradas = 0;
  let indice = 0;
  // O documento tem duas tabelas: a 1ª é o matutino, a 2ª o vespertino. Cada
  // uma começa com uma linha de cabeçalho.
  let bloco = 0;
  let periodo = "";

  const trs = xml.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) ?? [];

  for (const tr of trs) {
    indice += 1;
    const celulas = (tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) ?? []).map(limpaXml);
    if (celulas.length === 0) continue;
    if (ehCabecalho(celulas)) {
      bloco += 1;
      periodo = bloco === 1 ? "matutino" : bloco === 2 ? "vespertino" : "";
      ignoradas += 1;
      continue;
    }
    const horario = normalizeTime(celulas[0] ?? "");
    const nome = (celulas[1] ?? "").trim();
    if (!horario || !nome) {
      ignoradas += 1; // horário livre
      continue;
    }
    linhas.push({
      row: indice,
      horario,
      nome,
      presenca: (celulas[2] ?? "").trim() || undefined,
      contato: (celulas[3] ?? "").trim() || undefined,
      escola: (celulas[5] ?? "").trim() || undefined,
      responsavel: (celulas[6] ?? "").trim() || undefined,
      periodo: periodo || undefined,
    });
  }

  return { data, diaSemana, profissional, linhas, ignoradas };
}

/** Lê agenda de CSV: primeira linha é cabeçalho; separador `,` ou `;`. */
export function lerAgendaCsv(texto: string): AgendaLida {
  const linhasTxt = texto.split(/\r?\n/).filter((l) => l.trim());
  if (linhasTxt.length === 0) return { linhas: [], ignoradas: 0 };
  const sep = (linhasTxt[0].match(/;/g)?.length ?? 0) > (linhasTxt[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const cab = linhasTxt[0].split(sep).map((c) => c.trim().toLowerCase());
  const idx = (nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.includes(n)));
  const iHora = idx(["horário", "horario", "hora", "início", "inicio"]);
  const iNome = idx(["nome", "aluno", "paciente", "estudante"]);
  const iEscola = idx(["escola"]);
  const iContato = idx(["contato", "telefone"]);
  const iData = idx(["data"]);

  const linhas: LinhaAgenda[] = [];
  let ignoradas = 0;
  let data: string | undefined;

  for (let i = 1; i < linhasTxt.length; i++) {
    const cols = linhasTxt[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const horario = iHora >= 0 ? normalizeTime(cols[iHora] ?? "") : null;
    const nome = iNome >= 0 ? (cols[iNome] ?? "").trim() : "";
    if (iData >= 0 && !data) data = dataBRparaISO(cols[iData] ?? "");
    if (!horario || !nome) {
      ignoradas += 1;
      continue;
    }
    linhas.push({
      row: i + 1,
      horario,
      nome,
      escola: iEscola >= 0 ? cols[iEscola] : undefined,
      contato: iContato >= 0 ? cols[iContato] : undefined,
    });
  }
  return { data, linhas, ignoradas };
}

/** Escolhe o leitor pelo nome do arquivo. */
export function lerAgenda(filename: string, base64: string): AgendaLida {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const bytes = base64ParaBytes(base64);
  if (ext === "docx") return lerAgendaDocx(bytes);
  if (ext === "csv" || ext === "txt") {
    return lerAgendaCsv(new TextDecoder("utf-8").decode(bytes));
  }
  throw new Error(
    `Formato .${ext} não suportado nesta versão. Use .docx (agenda do CEAP) ou .csv.`,
  );
}
