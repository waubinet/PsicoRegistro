import { describe, expect, it } from "vitest";
import { ATALHOS, focoEmCampo, resolver, rotulo } from "./atalhos";

const ev = (o: Partial<Parameters<typeof resolver>[0]>) => ({
  key: "n",
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...o,
});

describe("resolução de atalhos", () => {
  it("reconhece Ctrl+N", () => {
    expect(resolver(ev({ key: "n", ctrlKey: true }))?.acao).toBe("novo-atendimento");
  });

  it("reconhece Ctrl+K", () => {
    expect(resolver(ev({ key: "k", ctrlKey: true }))?.acao).toBe("/pesquisa");
  });

  it("exige os modificadores exatos", () => {
    // N sozinho não é atalho
    expect(resolver(ev({ key: "n" }))).toBeNull();
    // Ctrl+Shift+N também não (Ctrl+N não pede Shift)
    expect(resolver(ev({ key: "n", ctrlKey: true, shiftKey: true }))).toBeNull();
  });

  it("Ctrl+Shift+A abre a agenda", () => {
    expect(resolver(ev({ key: "a", ctrlKey: true, shiftKey: true }))?.acao).toBe("/agenda");
    expect(resolver(ev({ key: "a", ctrlKey: true }))).toBeNull();
  });

  it("aceita a tecla Command no lugar de Ctrl", () => {
    expect(resolver(ev({ key: "k", ctrlKey: false, metaKey: true }))?.acao).toBe("/pesquisa");
  });

  it("ignora maiúsculas", () => {
    expect(resolver(ev({ key: "N", ctrlKey: true }))?.acao).toBe("novo-atendimento");
  });
});

describe("proteção do foco em campos", () => {
  it("não dispara dentro de input, textarea ou select", () => {
    for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(focoEmCampo({ tagName: tag } as unknown as EventTarget)).toBe(true);
    }
  });

  it("não dispara em conteúdo editável", () => {
    expect(
      focoEmCampo({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget),
    ).toBe(true);
  });

  it("dispara fora de campos", () => {
    expect(focoEmCampo({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
    expect(focoEmCampo(null)).toBe(false);
  });
});

describe("rótulos", () => {
  it("descreve a combinação", () => {
    expect(rotulo(ATALHOS.find((a) => a.acao === "novo-atendimento")!)).toBe("Ctrl + N");
    expect(rotulo(ATALHOS.find((a) => a.acao === "/agenda")!)).toBe("Ctrl + Shift + A");
  });

  it("todos os atalhos têm descrição", () => {
    for (const a of ATALHOS) expect(a.descricao.length).toBeGreaterThan(3);
  });
});
