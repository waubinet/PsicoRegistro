import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dataBRparaISO, lerAgendaCsv, lerAgendaDocx } from "./agendaImport";

/**
 * Os .docx reais do usuário ficam fora do repositório. Quando existirem nesta
 * máquina, o teste roda contra eles (sem modificá-los); senão, é ignorado.
 */
const PASTA_REAL = "C:/Users/waubi/OneDrive/Documentos/02 Pessoal/Trabalho";

describe("datas", () => {
  it("converte data BR para ISO", () => {
    expect(dataBRparaISO("Data: 23/06/2026")).toBe("2026-06-23");
    expect(dataBRparaISO("8/8/25")).toBe("2025-08-08");
    expect(dataBRparaISO("sem data")).toBeUndefined();
  });
});

describe("importação CSV", () => {
  it("lê colunas por cabeçalho e ignora linhas sem nome", () => {
    const csv = [
      "Data;Horário;Nome;Escola",
      "23/06/2026;8h30;ELIZA GALVAO RIBEIRO;ATIORO",
      "23/06/2026;9h30;;ATIORO",
      "23/06/2026;10h30;LUKECIO DHON;NOVA REPUBLICA",
    ].join("\n");
    const r = lerAgendaCsv(csv);
    expect(r.data).toBe("2026-06-23");
    expect(r.linhas).toHaveLength(2);
    expect(r.ignoradas).toBe(1);
    expect(r.linhas[0]).toMatchObject({
      horario: "08:30",
      nome: "ELIZA GALVAO RIBEIRO",
      escola: "ATIORO",
    });
  });

  it("aceita separador vírgula", () => {
    const r = lerAgendaCsv("Horario,Nome\n14:00,Paciente Exemplo A");
    expect(r.linhas[0].horario).toBe("14:00");
  });
});

describe("importação .docx (agenda real do CEAP)", () => {
  const arquivos = fs.existsSync(PASTA_REAL)
    ? fs.readdirSync(PASTA_REAL).filter((f) => f.startsWith("Agenda de Atendimento") && f.endsWith(".docx"))
    : [];

  it.skipIf(arquivos.length === 0)("extrai data, horários, nomes e escolas", () => {
    let totalLinhas = 0;
    let comData = 0;
    for (const nome of arquivos) {
      const bytes = new Uint8Array(fs.readFileSync(path.join(PASTA_REAL, nome)));
      const r = lerAgendaDocx(bytes);
      // A data pode faltar (há agenda com "Data: 08/10", sem ano). Quando vier,
      // precisa estar em ISO; quando não, o assistente pede ao usuário.
      if (r.data !== undefined) {
        expect(r.data, `${nome}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        comData += 1;
      }
      for (const l of r.linhas) {
        expect(l.horario).toMatch(/^\d{2}:\d{2}$/);
        expect(l.nome.length).toBeGreaterThan(2);
      }
      totalLinhas += r.linhas.length;
    }
    expect(totalLinhas, "os arquivos reais têm atendimentos preenchidos").toBeGreaterThan(0);
    expect(comData, "a maioria das agendas traz a data completa").toBeGreaterThan(0);
  });

  it.skipIf(arquivos.length === 0)("separa matutino de vespertino pelo horário", () => {
    for (const nome of arquivos) {
      const bytes = new Uint8Array(fs.readFileSync(path.join(PASTA_REAL, nome)));
      const r = lerAgendaDocx(bytes);
      for (const l of r.linhas) {
        const hora = Number(l.horario.slice(0, 2));
        if (hora < 12) expect(l.periodo, `${nome} ${l.horario}`).toBe("matutino");
        else expect(l.periodo, `${nome} ${l.horario}`).toBe("vespertino");
      }
    }
  });

  it.skipIf(arquivos.length === 0)("dia da semana não vem colado ao resto do texto", () => {
    for (const nome of arquivos) {
      const bytes = new Uint8Array(fs.readFileSync(path.join(PASTA_REAL, nome)));
      const r = lerAgendaDocx(bytes);
      if (r.diaSemana) {
        expect(r.diaSemana, nome).not.toMatch(/MATUTINO|HOR[ÁA]RIO|NOME/i);
        expect(r.diaSemana.length).toBeLessThan(20);
      }
    }
  });

  it.skipIf(arquivos.length === 0)("não confunde cabeçalho com atendimento", () => {
    for (const nome of arquivos) {
      const bytes = new Uint8Array(fs.readFileSync(path.join(PASTA_REAL, nome)));
      const r = lerAgendaDocx(bytes);
      for (const l of r.linhas) {
        expect(l.nome.toLowerCase()).not.toContain("nome completo");
        expect(l.horario).not.toBe("");
      }
    }
  });
});
