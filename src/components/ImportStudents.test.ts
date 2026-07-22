import { describe, expect, it } from "vitest";
import { parseStudentLines } from "./parseStudents";

describe("importação de lista nominal", () => {
  it("aceita um nome por linha", () => {
    const r = parseStudentLines("ANA LIVIA\nJOÃO LUCAS\n\n  MARIA  ");
    expect(r.map((x) => x.full_name)).toEqual(["ANA LIVIA", "JOÃO LUCAS", "MARIA"]);
  });

  it("remove numeração e separa colunas do Excel (nome/sexo/nascimento)", () => {
    const r = parseStudentLines("1\tANA LIVIA DA SILVA\tF\t12/06/2022");
    expect(r[0]).toEqual({ full_name: "ANA LIVIA DA SILVA", gender: "Feminino", birth_date: "2022-06-12" });
  });

  it("reconhece Masculino e ignora linhas vazias", () => {
    const r = parseStudentLines("2) JOÃO LUCAS FERREIRA; M; 21/03/2025");
    expect(r[0].gender).toBe("Masculino");
    expect(r[0].birth_date).toBe("2025-03-21");
    expect(r[0].full_name).toBe("JOÃO LUCAS FERREIRA");
  });
});
