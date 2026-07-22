import { describe, expect, it } from "vitest";
import { inRange, presetsForYear } from "./period";

describe("períodos", () => {
  it("gera presets do ano com bimestres e semestres", () => {
    const p = presetsForYear(2026);
    const anual = p.find((x) => x.value === "anual")!;
    expect(anual.from).toBe("2026-01-01");
    expect(anual.to).toBe("2026-12-31");
    expect(p.find((x) => x.value === "sem1")!.to).toBe("2026-06-30");
    expect(p.filter((x) => x.value.startsWith("bim"))).toHaveLength(4);
  });

  it("filtra por intervalo de datas", () => {
    expect(inRange("2026-03-15", "2026-01-01", "2026-06-30")).toBe(true);
    expect(inRange("2026-08-15", "2026-01-01", "2026-06-30")).toBe(false);
    expect(inRange(null, "2026-01-01", "2026-12-31")).toBe(false);
    expect(inRange("2026-05-10T14:00:00Z", "2026-05-01", "2026-05-31")).toBe(true);
  });
});
