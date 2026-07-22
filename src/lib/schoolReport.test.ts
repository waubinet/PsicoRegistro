import { describe, expect, it } from "vitest";
import type { Entity } from "./api";
import { relatorioAluno, resumoEscola, situacaoAluno } from "./schoolReport";

function ent(o: Partial<Entity>): Entity {
  return { id: "x", created_at: "", updated_at: "", deleted_at: null, ...o } as Entity;
}

describe("relatório escolar", () => {
  const students = [ent({ id: "a", full_name: "Aluno A", grade: "Nível I" }), ent({ id: "b", full_name: "Aluno B" }), ent({ id: "c", full_name: "Aluno C" })];
  const records = [ent({ id: "r1", student_id: "a", record_date: "2026-03-10", activity_type: "escuta" })];
  const reminders = [ent({ id: "m1", linked_id: "b", status: "pendente" })];

  it("deriva situação: atendido/agendado/pendente", () => {
    expect(situacaoAluno("a", records, reminders)).toBe("atendido");
    expect(situacaoAluno("b", records, reminders)).toBe("agendado");
    expect(situacaoAluno("c", records, reminders)).toBe("pendente");
  });

  it("resume a escola", () => {
    const r = resumoEscola(students, records, reminders);
    expect(r).toEqual({ total: 3, atendidos: 1, agendados: 1, pendentes: 1 });
  });

  it("relatório do aluno filtra pelo período", () => {
    const secs = relatorioAluno(students[0], records, "2026-01-01", "2026-06-30");
    expect(secs[0].fields.find((f) => f.label === "Total de atendimentos")?.value).toBe("1");
    const secsFora = relatorioAluno(students[0], records, "2026-07-01", "2026-12-31");
    expect(secsFora[0].fields.find((f) => f.label === "Total de atendimentos")?.value).toBe("0");
  });
});
