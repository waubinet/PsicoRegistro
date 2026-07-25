/**
 * Gera a "Ocorrência de Visita" em PDF no formato usado pelo profissional:
 * título, nome da escola, texto corrido, cidade + data por extenso e duas
 * linhas de assinatura (coordenação da escola e psicólogo).
 */
import { jsPDF } from "jspdf";
import { dataPorExtenso } from "./dateExtenso";

export type OcorrenciaDoc = {
  escola: string;
  dataISO: string;
  narrativa: string;
  cidade: string;
  profissional?: string;
  crp?: string;
};

export function gerarOcorrenciaPDF(d: OcorrenciaDoc): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const LEFT = 25;
  const RIGHT = 25;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LARGURA = W - LEFT - RIGHT;
  let y = 30;

  const quebra = (altura: number) => {
    if (y + altura > H - 55) {
      doc.addPage();
      y = 30;
    }
  };

  // Título
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("OCORRÊNCIA DE VISITA", W / 2, y, { align: "center" });
  y += 14;

  // Escola
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  for (const linha of doc.splitTextToSize(d.escola, LARGURA)) {
    quebra(7);
    doc.text(linha, LEFT, y);
    y += 7;
  }
  y += 4;

  // Corpo, justificado e com recuo de parágrafo
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const paragrafos = d.narrativa.split(/\n+/).filter((p) => p.trim());
  for (const p of paragrafos) {
    const linhas = doc.splitTextToSize(`      ${p.trim()}`, LARGURA);
    for (const linha of linhas) {
      quebra(7);
      doc.text(linha, LEFT, y, { maxWidth: LARGURA });
      y += 7;
    }
    y += 3;
  }

  // Cidade e data
  y = Math.max(y + 12, H - 62);
  doc.setFont("times", "normal");
  doc.text(`${d.cidade}, ${dataPorExtenso(d.dataISO)}`, LEFT, y);

  // Assinaturas
  y = H - 38;
  const larguraLinha = 65;
  const x1 = LEFT + 5;
  const x2 = W - RIGHT - larguraLinha - 5;
  doc.setLineWidth(0.3);
  doc.line(x1, y, x1 + larguraLinha, y);
  doc.line(x2, y, x2 + larguraLinha, y);
  y += 5;
  doc.setFontSize(10);
  doc.text("Coordenador/Diretor(a) da escola", x1 + larguraLinha / 2, y, { align: "center" });
  const assinaturaPsi = d.profissional
    ? `${d.profissional}${d.crp ? ` — CRP ${d.crp}` : ""}`
    : "Psicólogo";
  doc.text(assinaturaPsi, x2 + larguraLinha / 2, y, { align: "center", maxWidth: larguraLinha + 20 });
  if (d.profissional) {
    y += 4.5;
    doc.text("Psicólogo(a)", x2 + larguraLinha / 2, y, { align: "center" });
  }

  return doc.output("arraybuffer");
}
