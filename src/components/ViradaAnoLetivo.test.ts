import { describe, expect, it } from "vitest";
import { proximaSerie } from "./ViradaAnoLetivo";

describe("virada de ano — próxima série", () => {
  it("avança séries em algarismos arábicos", () => {
    expect(proximaSerie("3º ano")).toBe("4º ano");
    expect(proximaSerie("9º ano")).toBe("10º ano");
    expect(proximaSerie("1o ano")).toBe("2º ano");
  });

  it("avança níveis em algarismos romanos", () => {
    expect(proximaSerie("Nível I")).toBe("Nível II");
    expect(proximaSerie("Nível III")).toBe("Nível IV");
  });

  it("devolve null quando não sabe avançar", () => {
    expect(proximaSerie("Maternal")).toBeNull();
    expect(proximaSerie("")).toBeNull();
  });
});
