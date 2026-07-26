import { describe, expect, it } from "vitest";
import {
  addMinutes,
  durationOf,
  expandRecurrence,
  findConflicts,
  monthGrid,
  normalizeTime,
  overlaps,
  startOfWeek,
  weekDays,
} from "./agendaTime";

describe("horários", () => {
  it("normaliza formatos usados nas agendas em .docx", () => {
    expect(normalizeTime("8h30")).toBe("08:30");
    expect(normalizeTime("8h")).toBe("08:00");
    expect(normalizeTime("13h00")).toBe("13:00");
    expect(normalizeTime("08:30")).toBe("08:30");
    expect(normalizeTime("")).toBeNull();
    expect(normalizeTime("25h")).toBeNull();
  });

  it("soma minutos e calcula duração", () => {
    expect(addMinutes("14:00", 50)).toBe("14:50");
    expect(addMinutes("23:30", 45)).toBe("00:15");
    expect(durationOf("14:00", "14:50")).toBe(50);
    expect(durationOf("14:50", "14:00")).toBe(0);
  });
});

describe("semana e mês", () => {
  it("semana começa na segunda", () => {
    // 2026-07-22 é uma quarta
    expect(startOfWeek("2026-07-22")).toBe("2026-07-20");
    // domingo pertence à semana que começou na segunda anterior
    expect(startOfWeek("2026-07-26")).toBe("2026-07-20");
    const dias = weekDays("2026-07-22");
    expect(dias).toHaveLength(7);
    expect(dias[0]).toBe("2026-07-20");
    expect(dias[6]).toBe("2026-07-26");
  });

  it("grade do mês cobre semanas completas", () => {
    const g = monthGrid("2026-07-15");
    expect(g[0]).toHaveLength(7);
    expect(g.flat()).toContain("2026-07-01");
    expect(g.flat()).toContain("2026-07-31");
  });
});

describe("conflitos", () => {
  const base = { date: "2026-07-22", start: "14:00", end: "14:50" };

  it("detecta sobreposição parcial", () => {
    expect(overlaps(base, { date: "2026-07-22", start: "14:30", end: "15:20" })).toBe(true);
  });

  it("encostar não é conflito", () => {
    expect(overlaps(base, { date: "2026-07-22", start: "14:50", end: "15:40" })).toBe(false);
  });

  it("dias diferentes nunca conflitam", () => {
    expect(overlaps(base, { date: "2026-07-23", start: "14:00", end: "14:50" })).toBe(false);
  });

  it("ignora cancelados e o próprio evento", () => {
    const existentes = [
      { id: "a", date: "2026-07-22", start: "14:00", end: "14:50", status: "agendado" },
      { id: "b", date: "2026-07-22", start: "14:10", end: "15:00", status: "cancelado" },
    ];
    expect(findConflicts(base, existentes)).toHaveLength(1);
    expect(findConflicts(base, existentes, "a")).toHaveLength(0);
  });
});

describe("recorrência", () => {
  it("semanal gera as datas do mesmo dia da semana", () => {
    const datas = expandRecurrence({
      frequency: "semanal",
      startDate: "2026-07-21", // terça
      endDate: "2026-08-11",
    });
    expect(datas).toEqual(["2026-07-21", "2026-07-28", "2026-08-04", "2026-08-11"]);
  });

  it("quinzenal pula uma semana", () => {
    const datas = expandRecurrence({
      frequency: "quinzenal",
      startDate: "2026-07-21",
      endDate: "2026-09-01",
    });
    expect(datas).toEqual(["2026-07-21", "2026-08-04", "2026-08-18", "2026-09-01"]);
  });

  it("respeita o número de ocorrências", () => {
    const datas = expandRecurrence({ frequency: "semanal", startDate: "2026-07-21", count: 3 });
    expect(datas).toHaveLength(3);
  });

  it("aceita vários dias da semana", () => {
    const datas = expandRecurrence({
      frequency: "semanal",
      startDate: "2026-07-20", // segunda
      endDate: "2026-07-26",
      daysOfWeek: [1, 3, 5], // seg, qua, sex
    });
    expect(datas).toEqual(["2026-07-20", "2026-07-22", "2026-07-24"]);
  });

  it("mensal mantém o dia e pula meses sem esse dia", () => {
    const datas = expandRecurrence({
      frequency: "mensal",
      startDate: "2026-01-31",
      endDate: "2026-04-30",
    });
    // fevereiro e abril não têm dia 31 — são pulados, nunca deslocados
    expect(datas).toEqual(["2026-01-31", "2026-03-31"]);
  });

  it("personalizado usa intervalo em dias", () => {
    const datas = expandRecurrence({
      frequency: "personalizado",
      interval: 10,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(datas).toEqual(["2026-07-01", "2026-07-11", "2026-07-21", "2026-07-31"]);
  });

  it("sem fim não gera infinitamente", () => {
    const datas = expandRecurrence({ frequency: "semanal", startDate: "2026-01-01" });
    expect(datas.length).toBeGreaterThan(40);
    expect(datas.length).toBeLessThanOrEqual(400);
  });
});
