/** Datas: internamente ISO 8601; exibição no formato brasileiro. */

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return formatDateBR(iso);
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Idade em anos completos a partir de data ISO (yyyy-mm-dd). */
export function ageFrom(birthISO: string | null | undefined, ref?: Date): number | null {
  if (!birthISO) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthISO);
  if (!m) return null;
  const now = ref ?? new Date();
  let age = now.getFullYear() - Number(m[1]);
  const beforeBirthday =
    now.getMonth() + 1 < Number(m[2]) ||
    (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]));
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Duração em minutos entre horários HH:MM. */
export function durationMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const p = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = p(start);
  const b = p(end);
  if (a == null || b == null) return null;
  const d = b - a;
  return d > 0 ? d : null;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}
