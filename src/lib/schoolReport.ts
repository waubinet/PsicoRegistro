/**
 * Monta os relatórios escolares (por período) a partir dos dados já decifrados.
 * Segue a lógica da planilha CEAP: por escola (resumo + atendimentos) e por aluno
 * (ficha do período). Mantém caráter administrativo/técnico — sem conteúdo
 * clínico detalhado nem diagnóstico, conforme a ética profissional.
 */
import type { Entity } from "./api";
import type { ExportSection } from "@/components/ExportDialog";
import { formatDateBR } from "./format";
import { inRange } from "./period";
import { labelOf, SCHOOL_ACTIVITY_TYPES } from "./options";

export type Situacao = "atendido" | "agendado" | "pendente";

/** Deriva a situação de atendimento do aluno (como na aba Resumo da planilha). */
export function situacaoAluno(
  studentId: string,
  records: Entity[],
  reminders: Entity[],
): Situacao {
  const recs = records.filter((r) => r.student_id === studentId);
  if (recs.length > 0) return "atendido";
  const hasFutureFollow =
    recs.some((r) => r.followup_date && String(r.followup_date) >= new Date().toISOString().slice(0, 10)) ||
    reminders.some(
      (m) => m.linked_id === studentId && m.status === "pendente",
    );
  return hasFutureFollow ? "agendado" : "pendente";
}

export function resumoEscola(
  students: Entity[],
  records: Entity[],
  reminders: Entity[],
): { total: number; atendidos: number; agendados: number; pendentes: number } {
  let atendidos = 0,
    agendados = 0,
    pendentes = 0;
  for (const s of students) {
    const sit = situacaoAluno(s.id, records, reminders);
    if (sit === "atendido") atendidos += 1;
    else if (sit === "agendado") agendados += 1;
    else pendentes += 1;
  }
  return { total: students.length, atendidos, agendados, pendentes };
}

/** Relatório da escola no período: resumo + atendimentos por tipo + por aluno. */
export function relatorioEscola(
  schoolName: string,
  students: Entity[],
  allRecords: Entity[],
  reminders: Entity[],
  from: string,
  to: string,
): ExportSection[] {
  const periodRecords = allRecords.filter((r) => inRange(r.record_date as string, from, to));
  const resumo = resumoEscola(students, allRecords, reminders);

  // atendimentos por tipo no período
  const byType = new Map<string, number>();
  for (const r of periodRecords) {
    const k = labelOf(SCHOOL_ACTIVITY_TYPES, r.activity_type);
    byType.set(k, (byType.get(k) ?? 0) + 1);
  }

  const sections: ExportSection[] = [
    {
      title: `Resumo — ${schoolName}`,
      fields: [
        { label: "Período", value: `${formatDateBR(from)} a ${formatDateBR(to)}` },
        { label: "Total de alunos", value: String(resumo.total) },
        { label: "Atendidos", value: String(resumo.atendidos) },
        { label: "Agendados", value: String(resumo.agendados) },
        { label: "Pendentes", value: String(resumo.pendentes) },
        { label: "Atendimentos no período", value: String(periodRecords.length) },
      ],
    },
    {
      title: "Atendimentos por tipo (no período)",
      fields:
        byType.size === 0
          ? [{ label: "—", value: "Nenhum atendimento no período." }]
          : [...byType.entries()].map(([k, v]) => ({ label: k, value: String(v) })),
    },
    {
      title: "Atendimentos por aluno (no período)",
      fields: students.map((s) => {
        const n = periodRecords.filter((r) => r.student_id === s.id).length;
        return { label: String(s.full_name), value: `${n} atendimento(s)` };
      }),
    },
  ];
  return sections;
}

/** Relatório individual do aluno no período: ficha administrativa dos atendimentos. */
export function relatorioAluno(
  student: Entity,
  allRecords: Entity[],
  from: string,
  to: string,
): ExportSection[] {
  const recs = allRecords
    .filter((r) => r.student_id === student.id && inRange(r.record_date as string, from, to))
    .sort((a, b) => String(a.record_date).localeCompare(String(b.record_date)));
  return [
    {
      title: `Ficha de atendimentos — ${String(student.full_name)}`,
      fields: [
        { label: "Ano/série", value: String(student.grade ?? "—") },
        { label: "Período", value: `${formatDateBR(from)} a ${formatDateBR(to)}` },
        { label: "Total de atendimentos", value: String(recs.length) },
      ],
    },
    {
      title: "Atendimentos",
      fields:
        recs.length === 0
          ? [{ label: "—", value: "Nenhum atendimento no período." }]
          : recs.map((r) => ({
              label: `${formatDateBR(r.record_date as string)} — ${labelOf(SCHOOL_ACTIVITY_TYPES, r.activity_type)}`,
              value: String(r.objective ?? r.performed ?? r.situation ?? ""),
            })),
    },
  ];
}
