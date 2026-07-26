import { describe, expect, it } from "vitest";
import type { Entity } from "./api";
import { classificar, ehDuplicado, normalizarNome, resumoClassificacao } from "./agendaMatch";

function ent(o: Partial<Entity>): Entity {
  return { id: "x", created_at: "", updated_at: "", deleted_at: null, ...o } as Entity;
}

const escolas = new Map([["e1", "Escola Municipal Modelo"]]);
const estudantes = [
  ent({ id: "s1", full_name: "ESTUDANTE EXEMPLO A", school_id: "e1", grade: "7º ano" }),
  ent({ id: "s2", full_name: "Aluno Demonstracao Silva", school_id: "e1", grade: "8º ano" }),
];
const pacientes = [ent({ id: "p1", full_name: "Paciente Exemplo A" })];

describe("normalização de nomes", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(normalizarNome("ESTUDANTE EXEMPLO A")).toBe("estudante exemplo a");
    expect(normalizarNome("José  D'Ávila")).toBe("jose d avila");
  });
});

describe("classificação", () => {
  const linha = (nome: string) => ({ row: 1, horario: "08:30", nome });

  it("correspondência exata é segura e já vem escolhida", () => {
    const r = classificar([linha("Estudante Exemplo A")], estudantes, pacientes, escolas);
    expect(r[0].classificacao).toBe("segura");
    expect(r[0].escolhido).toBe("s1");
    expect(r[0].candidatos[0].detalhe).toContain("Modelo");
  });

  it("nome parcial vira sugestão que exige confirmação", () => {
    const r = classificar([linha("Aluno Demonstracao")], estudantes, pacientes, escolas);
    expect(r[0].classificacao).toBe("possivel");
    expect(r[0].escolhido).toBe("");
    expect(r[0].candidatos[0].id).toBe("s2");
  });

  it("desconhecido não é vinculado nem cadastrado", () => {
    const r = classificar([linha("Pessoa Inexistente Aqui")], estudantes, pacientes, escolas);
    expect(r[0].classificacao).toBe("nao_encontrado");
    expect(r[0].candidatos).toHaveLength(0);
    expect(r[0].escolhido).toBe("");
  });

  it("resumo conta cada classificação", () => {
    const r = classificar(
      [linha("Estudante Exemplo A"), linha("Aluno Demonstracao"), linha("Ninguém")],
      estudantes,
      pacientes,
      escolas,
    );
    expect(resumoClassificacao(r)).toEqual({
      total: 3,
      seguras: 1,
      possiveis: 1,
      naoEncontrados: 1,
    });
  });
});

describe("duplicados", () => {
  const existentes = [
    { event_date: "2026-06-23", start_at: "08:30", student_id: "s1", title: "Estudante" },
  ];

  it("detecta mesmo horário, data e pessoa", () => {
    expect(ehDuplicado(existentes, "2026-06-23", "08:30", "s1", "Estudante")).toBe(true);
  });

  it("horário ou data diferentes não é duplicado", () => {
    expect(ehDuplicado(existentes, "2026-06-23", "09:30", "s1", "Estudante")).toBe(false);
    expect(ehDuplicado(existentes, "2026-06-24", "08:30", "s1", "Estudante")).toBe(false);
  });

  it("sem vínculo, compara pelo nome", () => {
    expect(ehDuplicado(existentes, "2026-06-23", "08:30", "", "ESTUDANTE")).toBe(true);
  });
});
