import { describe, expect, it } from "vitest";
import {
  CAMPOS_DESCRITIVOS,
  chaveItem,
  contarMarcados,
  MOTIVOS_ENCAMINHAMENTO,
  SECOES,
} from "./fichaEncaminhamento";

describe("ficha de encaminhamento", () => {
  it("reproduz a estrutura do documento oficial", () => {
    expect(MOTIVOS_ENCAMINHAMENTO).toHaveLength(8);
    expect(SECOES.map((s) => s.id)).toEqual([
      "psicomotor",
      "cognicao",
      "linguagem",
      "comportamento",
      "emocional",
      "ah_sd",
    ]);
    expect(CAMPOS_DESCRITIVOS.length).toBeGreaterThanOrEqual(9);
  });

  it("todo grupo tem itens e título", () => {
    for (const s of SECOES) {
      expect(s.grupos.length).toBeGreaterThan(0);
      for (const g of s.grupos) {
        expect(g.titulo).toBeTruthy();
        expect(g.itens.length).toBeGreaterThan(0);
      }
    }
  });

  it("gera chaves únicas por item", () => {
    const chaves = new Set<string>();
    for (const s of SECOES) {
      for (const g of s.grupos) {
        g.itens.forEach((_, i) => chaves.add(chaveItem(s.id, g.id, i)));
      }
    }
    const total = SECOES.reduce((n, s) => n + s.grupos.reduce((m, g) => m + g.itens.length, 0), 0);
    expect(chaves.size).toBe(total);
    expect(total).toBeGreaterThan(90);
  });

  it("conta apenas os itens marcados", () => {
    const v = {
      [chaveItem("psicomotor", "espacial", 0)]: true,
      [chaveItem("psicomotor", "espacial", 1)]: false,
      [chaveItem("linguagem", "fala", 0)]: true,
      "txt:relacionamento": "texto qualquer",
      naturalidade: "Cidade Exemplo",
    };
    expect(contarMarcados(v)).toBe(2);
  });
});
