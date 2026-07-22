/** Períodos para relatórios (bimestral/semestral/anual), em ISO (yyyy-mm-dd). */

export type Preset = { value: string; label: string; from: string; to: string };

function d(year: number, m: number, day: number): string {
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Presets do ano letivo. Bimestres seguem a divisão escolar usual (editáveis). */
export function presetsForYear(year: number): Preset[] {
  return [
    { value: "anual", label: "Ano inteiro", from: d(year, 1, 1), to: d(year, 12, 31) },
    { value: "sem1", label: "1º semestre", from: d(year, 1, 1), to: d(year, 6, 30) },
    { value: "sem2", label: "2º semestre", from: d(year, 7, 1), to: d(year, 12, 31) },
    { value: "bim1", label: "1º bimestre", from: d(year, 2, 1), to: d(year, 4, 30) },
    { value: "bim2", label: "2º bimestre", from: d(year, 5, 1), to: d(year, 7, 31) },
    { value: "bim3", label: "3º bimestre", from: d(year, 8, 1), to: d(year, 9, 30) },
    { value: "bim4", label: "4º bimestre", from: d(year, 10, 1), to: d(year, 12, 20) },
  ];
}

/** Um registro (com campo de data ISO) está dentro do intervalo [from, to]? */
export function inRange(dateISO: string | null | undefined, from: string, to: string): boolean {
  if (!dateISO) return false;
  const day = String(dateISO).slice(0, 10);
  return day >= from && day <= to;
}

export function currentYear(): number {
  return new Date().getFullYear();
}
