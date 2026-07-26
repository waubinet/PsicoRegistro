/**
 * Folha "AGENDA DE ATENDIMENTO DIÁRIO" para impressão, no formato usado na rede:
 * cabeçalho institucional, tabelas MATUTINO e VESPERTINO com as colunas
 * HORÁRIO | NOME COMPLETO | P/F | CONTATO | SESSÕES | ESCOLA | RESPONSÁVEL.
 *
 * As colunas P/F (presença/falta) e RESPONSÁVEL saem **em branco** — são
 * preenchidas à mão no atendimento, e é ali que o responsável assina.
 */
import { jsPDF } from "jspdf";
import { formatDateBR } from "./format";

export type LinhaFolha = {
  horario: string;
  nome: string;
  contato?: string;
  sessoes?: string;
  escola?: string;
  periodo?: "matutino" | "vespertino" | string;
};

export type FolhaAgenda = {
  dataISO: string;
  diaSemana?: string;
  profissional?: string;
  /** Cabeçalho institucional (configurável em Configurações). */
  instituicao?: string;
  cabecalhoLinhas?: string[];
  subtitulo?: string;
  atendimento?: string;
  linhas: LinhaFolha[];
  /** Linhas em branco extras por período, para preencher à mão. */
  linhasVazias?: number;
};

const DIAS = [
  "DOMINGO",
  "SEGUNDA-FEIRA",
  "TERÇA-FEIRA",
  "QUARTA-FEIRA",
  "QUINTA-FEIRA",
  "SEXTA-FEIRA",
  "SÁBADO",
];

export function diaDaSemana(dataISO: string): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  if (!y) return "";
  return DIAS[new Date(y, (m ?? 1) - 1, d ?? 1).getDay()] ?? "";
}

/** Larguras das colunas (mm) — somam 180, a área útil do A4 com margem 15. */
const COLS = [20, 52, 12, 30, 16, 30, 20];
const TITULOS = [
  "HORÁRIO",
  "NOME COMPLETO",
  "P/F",
  "CONTATO",
  "SESSÕES",
  "ESCOLA",
  "RESPONSÁVEL",
];

export function gerarFolhaAgendaPDF(f: FolhaAgenda): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 14;

  // --- cabeçalho institucional ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  for (const linha of f.cabecalhoLinhas ?? []) {
    doc.text(linha, W / 2, y, { align: "center" });
    y += 4.2;
  }
  if (f.instituicao) {
    doc.setFontSize(9.5);
    doc.text(f.instituicao, W / 2, y, { align: "center" });
    y += 5;
  }

  y += 2;
  doc.setFontSize(12);
  doc.text("AGENDA DE ATENDIMENTO DIÁRIO", W / 2, y, { align: "center" });
  y += 5.5;
  if (f.subtitulo) {
    doc.setFontSize(9.5);
    doc.text(f.subtitulo, W / 2, y, { align: "center" });
    y += 5;
  }

  // --- identificação ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Atendimento: ${f.atendimento ?? "PSICOLOGIA"}`, M, y);
  y += 5;
  doc.text(`Profissional: ${(f.profissional ?? "").toUpperCase()}`, M, y);
  y += 5;
  doc.text(
    `Data: ${formatDateBR(f.dataISO)}      Dia da semana: ${
      f.diaSemana ?? diaDaSemana(f.dataISO)
    }`,
    M,
    y,
  );
  y += 7;

  const desenharTabela = (titulo: string, linhas: LinhaFolha[]) => {
    // título do período
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(titulo, M, y);
    y += 4.5;

    const alturaLinha = 9;
    const desenharLinha = (celulas: string[], negrito: boolean) => {
      if (y + alturaLinha > H - 22) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", negrito ? "bold" : "normal");
      doc.setFontSize(negrito ? 8.5 : 9);
      let x = M;
      celulas.forEach((txt, i) => {
        doc.rect(x, y, COLS[i], alturaLinha);
        if (txt) {
          const disponivel = COLS[i] - 3;
          const linhasTxt = doc.splitTextToSize(txt, disponivel);
          doc.text(String(linhasTxt[0] ?? ""), x + 1.5, y + alturaLinha / 2 + 1.2);
        }
        x += COLS[i];
      });
      y += alturaLinha;
    };

    desenharLinha(TITULOS, true);
    for (const l of linhas) {
      desenharLinha(
        [
          l.horario ?? "",
          l.nome ?? "",
          "", // P/F — preenchido à mão
          l.contato ?? "",
          l.sessoes ?? "",
          l.escola ?? "",
          "", // RESPONSÁVEL — assinatura
        ],
        false,
      );
    }
    // linhas em branco para acrescentar atendimentos na hora
    for (let i = 0; i < (f.linhasVazias ?? 2); i++) {
      desenharLinha(["", "", "", "", "", "", ""], false);
    }
    y += 4;
  };

  const matutino = f.linhas.filter((l) => Number(l.horario.slice(0, 2)) < 12);
  const vespertino = f.linhas.filter((l) => Number(l.horario.slice(0, 2)) >= 12);

  desenharTabela("MATUTINO", matutino);
  desenharTabela("VESPERTINO", vespertino);

  // --- legenda ---
  if (y > H - 20) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Legenda:  P = presença     F = falta", M, y + 2);
  doc.setFontSize(8);
  doc.text(
    "A coluna RESPONSÁVEL destina-se à assinatura do responsável pelo estudante.",
    M,
    y + 7,
  );

  return doc.output("arraybuffer");
}
