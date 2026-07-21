import { describe, expect, it } from "vitest";
import { ageFrom, durationMinutes, formatDateBR, daysSince } from "./format";
import { matchesLocal } from "./localSearch";

describe("format", () => {
  it("formata data ISO para BR", () => {
    expect(formatDateBR("2026-03-15")).toBe("15/03/2026");
    expect(formatDateBR("2026-03-15T10:00:00Z")).toBe("15/03/2026");
    expect(formatDateBR(null)).toBe("—");
  });

  it("calcula idade em anos completos", () => {
    const ref = new Date("2026-07-21T00:00:00Z");
    expect(ageFrom("2000-01-01", ref)).toBe(26);
    expect(ageFrom("2000-12-31", ref)).toBe(25);
    expect(ageFrom(undefined)).toBeNull();
  });

  it("calcula duração entre horários", () => {
    expect(durationMinutes("14:00", "14:50")).toBe(50);
    expect(durationMinutes("14:00", "13:00")).toBeNull();
    expect(durationMinutes(undefined, "14:00")).toBeNull();
  });

  it("dias desde uma data", () => {
    const iso = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(daysSince(iso)).toBe(3);
  });
});

describe("busca local", () => {
  it("é acento-insensível", () => {
    expect(matchesLocal("José da Conceição", "jose")).toBe(true);
    expect(matchesLocal("São João", "sao jo")).toBe(true);
    expect(matchesLocal("Maria", "pedro")).toBe(false);
  });
});
