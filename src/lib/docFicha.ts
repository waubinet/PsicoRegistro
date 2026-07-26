/**
 * PDF do "Registro Avaliativo Individual para Encaminhamento", no formato do
 * documento oficial: identificação, motivo, seções de checklist (com os itens
 * marcados), campos descritivos e assinatura do professor regente.
 *
 * Imprime apenas o que foi marcado/preenchido — a ficha sai enxuta, sem as
 * dezenas de linhas em branco do formulário original.
 */
import { jsPDF } from "jspdf";
import type { Entity } from "./api";
import { ageFrom, formatDateBR } from "./format";
import { dataPorExtenso } from "./dateExtenso";
import {
  CAMPOS_DESCRITIVOS,
  chaveItem,
  MOTIVOS_ENCAMINHAMENTO,
  SECOES,
} from "./fichaEncaminhamento";

export function gerarFichaPDF(d: {
  estudante: Entity;
  escola: Entity | null;
  valores: Record<string, unknown>;
  cidade: string;
}): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 18;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LARGURA = W - M * 2;
  let y = 18;
  const v = d.valores;

  const quebra = (alt: number) => {
    if (y + alt > H - 20) {
      doc.addPage();
      y = 18;
    }
  };

  const escrever = (txt: string, opts?: { bold?: boolean; size?: number; indent?: number }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 9.5);
    const x = M + (opts?.indent ?? 0);
    for (const linha of doc.splitTextToSize(txt, LARGURA - (opts?.indent ?? 0))) {
      quebra(5);
      doc.text(linha, x, y);
      y += 4.6;
    }
  };

  // título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("REGISTRO AVALIATIVO INDIVIDUAL PARA ENCAMINHAMENTO", W / 2, y, { align: "center" });
  y += 8;

  // identificação
  const idade = ageFrom(d.estudante.birth_date as string);
  const ident: [string, string][] = [
    ["Nome do(a) aluno(a)", String(d.estudante.full_name ?? "")],
    [
      "Data de nascimento",
      `${formatDateBR(d.estudante.birth_date as string)}${idade != null ? `   Idade: ${idade}` : ""}`,
    ],
    ["Escola", String(d.escola?.name ?? "")],
    ["Naturalidade", String(v.naturalidade ?? "")],
    ["Endereço", String(v.endereco ?? "")],
    ["Telefone", String(v.telefone ?? "")],
    ["Pai", String(v.pai ?? "")],
    ["Mãe", String(v.mae ?? "")],
    ["Com quem mora", String(v.com_quem_mora ?? "")],
    [
      "Ano letivo / Fase / Ciclo / Turma",
      [v.ano_letivo, v.fase, v.ciclo, d.estudante.class_name].filter(Boolean).join(" · "),
    ],
    ["Ano/série e turno", `${String(d.estudante.grade ?? "")}  ${String(d.estudante.shift ?? "")}`],
    [
      "Professor(a) sala regular",
      String(v.professor_regente ?? d.estudante.homeroom_teacher ?? ""),
    ],
  ];
  for (const [k, val] of ident) {
    if (val && val.trim()) escrever(`${k}: ${val}`);
  }
  y += 3;

  // motivo
  const motivos = MOTIVOS_ENCAMINHAMENTO.filter((_, i) => v[`chk:motivo.m.${i}`]);
  if (motivos.length > 0 || v.motivo_outro) {
    escrever("MOTIVO DO ENCAMINHAMENTO", { bold: true, size: 10.5 });
    for (const m of motivos) escrever(`(X) ${m}`, { indent: 4 });
    if (v.motivo_outro) escrever(`(X) Outro(s): ${String(v.motivo_outro)}`, { indent: 4 });
    y += 3;
  }

  // seções de checklist — só o que foi marcado
  for (const secao of SECOES) {
    const gruposComMarcas = secao.grupos
      .map((g) => ({
        g,
        marcados: g.itens.filter((_, i) => v[chaveItem(secao.id, g.id, i)]),
        outros: String(v[`txt:${secao.id}.${g.id}.outros`] ?? ""),
      }))
      .filter((x) => x.marcados.length > 0 || x.outros);
    if (gruposComMarcas.length === 0) continue;

    quebra(12);
    escrever(secao.titulo.toUpperCase(), { bold: true, size: 10.5 });
    for (const { g, marcados, outros } of gruposComMarcas) {
      escrever(g.titulo, { bold: true });
      for (const item of marcados) escrever(`(X) ${item}`, { indent: 4 });
      if (outros) escrever(`(X) Outros: ${outros}`, { indent: 4 });
    }
    if (secao.id === "comportamento" && v.freq_indisciplina) {
      escrever(`Frequência da indisciplina: ${String(v.freq_indisciplina)}`, { indent: 4 });
    }
    y += 2;
  }

  // campos descritivos
  const descritivos = CAMPOS_DESCRITIVOS.filter((c) => String(v[`txt:${c.id}`] ?? "").trim());
  if (descritivos.length > 0) {
    quebra(12);
    escrever("OBSERVAÇÕES DO PROFESSOR", { bold: true, size: 10.5 });
    for (const c of descritivos) {
      escrever(`${c.label}:`, { bold: true });
      escrever(String(v[`txt:${c.id}`]), { indent: 4 });
    }
  }

  // data e assinatura
  quebra(30);
  y = Math.max(y + 10, H - 40);
  const dataFicha = String(v.data_preenchimento ?? new Date().toISOString().slice(0, 10));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${d.cidade}, ${dataPorExtenso(dataFicha)}`, M, y);
  y += 16;
  doc.setLineWidth(0.3);
  doc.line(M + 20, y, M + 100, y);
  doc.setFontSize(9);
  doc.text("Professor(a) Sala Regular", M + 60, y + 5, { align: "center" });

  return doc.output("arraybuffer");
}
