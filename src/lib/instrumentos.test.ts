import { describe, expect, it } from "vitest";
import {
  agruparPorRespondente,
  filtrarInstrumentos,
  INSTRUMENTOS,
  urlManual,
} from "./instrumentos";

describe("base de instrumentos", () => {
  it("tem a curadoria completa e campos obrigatórios", () => {
    expect(INSTRUMENTOS.length).toBeGreaterThan(80);
    for (const i of INSTRUMENTOS) {
      expect(i.id, i.nome).toBeTruthy();
      expect(i.nome).toBeTruthy();
      expect(i.idadeMin).toBeLessThanOrEqual(i.idadeMax);
      expect(Array.isArray(i.demandas)).toBe(true);
    }
  });

  it("não tem ids repetidos", () => {
    const ids = INSTRUMENTOS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("filtro por idade e demanda", () => {
  it("respeita a faixa etária", () => {
    const crianca = filtrarInstrumentos({ idade: 7 });
    expect(crianca.every((i) => 7 >= i.idadeMin && 7 <= i.idadeMax)).toBe(true);
    // WAIS-III é 16+, não pode aparecer para 7 anos
    expect(crianca.find((i) => i.id === "wais4")).toBeUndefined();
    // WASI cobre 6–89, deve aparecer
    expect(crianca.find((i) => i.id === "wasi")).toBeDefined();
  });

  it("filtra por demanda", () => {
    const tdah = filtrarInstrumentos({ idade: 10, demandas: ["TDAH"] });
    expect(tdah.length).toBeGreaterThan(0);
    expect(tdah.every((i) => i.demandas.includes("TDAH"))).toBe(true);
  });

  it("ordena padrão-ouro e SATEPSI primeiro", () => {
    const r = filtrarInstrumentos({ idade: 10, demandas: ["TDAH"] });
    const primeiroNaoOuro = r.findIndex((i) => !i.ouro);
    const ultimoOuro = r.map((i) => !!i.ouro).lastIndexOf(true);
    if (primeiroNaoOuro >= 0 && ultimoOuro >= 0) {
      expect(ultimoOuro).toBeLessThan(primeiroNaoOuro);
    }
  });

  it("sem idade, devolve tudo que casa com a demanda", () => {
    const semIdade = filtrarInstrumentos({ demandas: ["MEM"] });
    expect(semIdade.every((i) => i.demandas.includes("MEM"))).toBe(true);
  });
});

describe("agrupamento e manuais", () => {
  it("agrupa por respondente", () => {
    const g = agruparPorRespondente(filtrarInstrumentos({ idade: 10 }));
    expect(Object.keys(g).length).toBeGreaterThan(1);
    for (const [resp, lista] of Object.entries(g)) {
      expect(lista.every((i) => i.respondente === resp)).toBe(true);
    }
  });

  it("monta a URL local do manual", () => {
    const u = urlManual("C:\\Users\\x\\Manuais", "Infantojuvenil/Manuais/WASI.pdf");
    expect(u).toContain("file:///C:/Users/x/Manuais/");
    expect(u).toContain("WASI.pdf");
    expect(urlManual("", "a.pdf")).toBeNull();
    expect(urlManual("C:/base", undefined)).toBeNull();
  });
});
