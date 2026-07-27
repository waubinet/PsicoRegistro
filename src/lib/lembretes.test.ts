import { describe, expect, it } from "vitest";
import type { AgendaEvent } from "./agenda";
import { aNotificar, minutosAte, textoLembrete } from "./lembretes";

function ev(o: Partial<AgendaEvent>): AgendaEvent {
  return {
    id: "e1",
    created_at: "",
    updated_at: "",
    deleted_at: null,
    event_date: "2026-07-26",
    start_at: "14:00",
    status: "agendado",
    title: "Paciente Exemplo A",
    ...o,
  } as AgendaEvent;
}

const HOJE = "2026-07-26";
/** 13:45 — 15 minutos antes do evento das 14:00. */
const agora = (h: number, m: number) => new Date(2026, 6, 26, h, m);

describe("privacidade da notificação", () => {
  it("não mostra o nome por padrão", () => {
    const t = textoLembrete(ev({}), false);
    expect(t.body).toBe("Você tem um atendimento às 14:00.");
    expect(t.body).not.toContain("Paciente");
    expect(t.title).not.toContain("Paciente");
  });

  it("mostra o nome apenas quando explicitamente ativado", () => {
    const t = textoLembrete(ev({}), true);
    expect(t.body).toContain("Paciente Exemplo A");
  });
});

describe("cálculo de antecedência", () => {
  it("conta os minutos até o início", () => {
    expect(minutosAte(ev({}), agora(13, 45))).toBe(15);
    expect(minutosAte(ev({}), agora(14, 10))).toBe(-10);
    expect(minutosAte(ev({ start_at: "" }), agora(13, 45))).toBeNull();
  });
});

describe("quais eventos notificar", () => {
  const eventos = [ev({ id: "a" }), ev({ id: "b", start_at: "16:00" })];

  it("notifica dentro da janela de antecedência", () => {
    const r = aNotificar(eventos, HOJE, agora(13, 50), 15, new Set());
    expect(r.map((e) => e.id)).toEqual(["a"]);
  });

  it("não notifica cedo demais", () => {
    expect(aNotificar(eventos, HOJE, agora(13, 0), 15, new Set())).toHaveLength(0);
  });

  it("não notifica evento que já começou", () => {
    expect(aNotificar(eventos, HOJE, agora(14, 5), 15, new Set())).toHaveLength(0);
  });

  it("ignora cancelados, realizados e faltas", () => {
    const outros = [
      ev({ id: "c", status: "cancelado" }),
      ev({ id: "d", status: "realizado" }),
      ev({ id: "f", status: "faltou" }),
    ];
    expect(aNotificar(outros, HOJE, agora(13, 50), 15, new Set())).toHaveLength(0);
  });

  it("não repete quem já foi avisado", () => {
    expect(aNotificar(eventos, HOJE, agora(13, 50), 15, new Set(["a"]))).toHaveLength(0);
  });

  it("desligado (0) não notifica nada", () => {
    expect(aNotificar(eventos, HOJE, agora(13, 50), 0, new Set())).toHaveLength(0);
  });

  it("ignora eventos de outro dia", () => {
    const amanha = [ev({ id: "x", event_date: "2026-07-27" })];
    expect(aNotificar(amanha, HOJE, agora(13, 50), 15, new Set())).toHaveLength(0);
  });
});
