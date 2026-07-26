/**
 * Lógica de datas/horários da agenda. Funções puras, sem dependência de React
 * ou do banco — o que permite testá-las diretamente.
 *
 * Convenção: datas em ISO `yyyy-mm-dd` e horários em `HH:MM` (24h), como no
 * restante do app. Nada de fuso horário: a agenda é local por natureza.
 */

export type Slot = { date: string; start: string; end: string };

/** Converte "HH:MM" em minutos desde a meia-noite; -1 se inválido. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm?.trim() ?? "");
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return -1;
  return h * 60 + min;
}

export function fromMinutes(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Aceita "8h30", "8h", "08:30" — formatos que aparecem nas agendas em .docx. */
export function normalizeTime(raw: string): string | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s/g, "");
  const m = /^(\d{1,2})(?:[h:](\d{0,2}))?h?$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutes(hhmm: string, minutes: number): string {
  const base = toMinutes(hhmm);
  return base < 0 ? hhmm : fromMinutes(base + minutes);
}

export function durationOf(start: string, end: string): number {
  const a = toMinutes(start);
  const b = toMinutes(end);
  return a < 0 || b < 0 ? 0 : Math.max(0, b - a);
}

/* ---------- datas ---------- */

export function parseISO(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const d = parseISO(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Segunda-feira da semana que contém `date`. */
export function startOfWeek(date: string): string {
  const d = parseISO(date);
  const dow = d.getDay(); // 0 = domingo
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

/** Os 7 dias da semana (segunda → domingo). */
export function weekDays(date: string): string[] {
  const seg = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(seg, i));
}

/** Grade do mês: semanas completas cobrindo o mês de `date`. */
export function monthGrid(date: string): string[][] {
  const d = parseISO(date);
  const primeiro = toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  const ultimo = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const semanas: string[][] = [];
  let cursor = startOfWeek(primeiro);
  do {
    semanas.push(weekDays(cursor));
    cursor = addDays(cursor, 7);
  } while (cursor <= ultimo);
  return semanas;
}

export function isWeekend(date: string): boolean {
  const dow = parseISO(date).getDay();
  return dow === 0 || dow === 6;
}

/* ---------- conflitos ---------- */

/** Dois intervalos no mesmo dia se sobrepõem? Encostar não é conflito. */
export function overlaps(a: Slot, b: Slot): boolean {
  if (a.date !== b.date) return false;
  const ia = toMinutes(a.start);
  const fa = toMinutes(a.end);
  const ib = toMinutes(b.start);
  const fb = toMinutes(b.end);
  if ([ia, fa, ib, fb].some((v) => v < 0)) return false;
  return ia < fb && ib < fa;
}

/** Eventos existentes que conflitam com `alvo` (ignora o próprio, por id). */
export function findConflicts<T extends Slot & { id?: string; status?: string }>(
  alvo: Slot,
  existentes: T[],
  ignorarId?: string,
): T[] {
  return existentes.filter(
    (e) =>
      e.id !== ignorarId &&
      e.status !== "cancelado" &&
      e.status !== "remarcado" &&
      overlaps(alvo, e),
  );
}

/* ---------- recorrência ---------- */

export type Recurrence = {
  frequency: "semanal" | "quinzenal" | "mensal" | "personalizado";
  /** Para "personalizado": intervalo em dias. */
  interval?: number;
  /** Dias da semana (0=dom … 6=sáb) para frequências semanais. */
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string;
  /** Número máximo de ocorrências. */
  count?: number;
};

const LIMITE_OCORRENCIAS = 400; // trava de segurança

/**
 * Expande a recorrência em datas concretas. Sem `endDate` nem `count`, gera até
 * `ateNoMaximo` (padrão: 1 ano) — a agenda materializa o que precisa exibir.
 */
export function expandRecurrence(r: Recurrence, ateNoMaximo?: string): string[] {
  const limite = ateNoMaximo ?? addDays(r.startDate, 365);
  const fim = r.endDate && r.endDate < limite ? r.endDate : limite;
  const out: string[] = [];
  const max = Math.min(r.count ?? LIMITE_OCORRENCIAS, LIMITE_OCORRENCIAS);

  if (r.frequency === "mensal") {
    const base = parseISO(r.startDate);
    const dia = base.getDate();
    let ano = base.getFullYear();
    let mes = base.getMonth();
    while (out.length < max) {
      // dias inexistentes (31 em meses curtos) são pulados, não deslocados
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      if (dia <= ultimoDia) {
        const data = toISODate(new Date(ano, mes, dia));
        if (data > fim) break;
        if (data >= r.startDate) out.push(data);
      }
      mes += 1;
      if (mes > 11) {
        mes = 0;
        ano += 1;
      }
      if (toISODate(new Date(ano, mes, 1)) > fim) break;
    }
    return out;
  }

  const passoSemanas = r.frequency === "quinzenal" ? 2 : 1;
  const dias =
    r.daysOfWeek && r.daysOfWeek.length > 0
      ? [...r.daysOfWeek].sort((a, b) => a - b)
      : [parseISO(r.startDate).getDay()];

  if (r.frequency === "personalizado") {
    const passo = Math.max(1, r.interval ?? 1);
    let cursor = r.startDate;
    while (cursor <= fim && out.length < max) {
      out.push(cursor);
      cursor = addDays(cursor, passo);
    }
    return out;
  }

  let semana = startOfWeek(r.startDate);
  let guarda = 0;
  while (out.length < max && guarda++ < LIMITE_OCORRENCIAS) {
    for (const dow of dias) {
      // segunda=índice 0 na nossa grade; domingo vai para o fim
      const offset = dow === 0 ? 6 : dow - 1;
      const data = addDays(semana, offset);
      if (data >= r.startDate && data <= fim && out.length < max) out.push(data);
    }
    semana = addDays(semana, 7 * passoSemanas);
    if (semana > fim) break;
  }
  return out.sort();
}

/** Rótulo curto da recorrência, para exibir no evento. */
export function recurrenceLabel(r: Recurrence): string {
  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const dias = (r.daysOfWeek ?? []).map((d) => nomes[d]).join(", ");
  if (r.frequency === "semanal") return dias ? `Toda ${dias}` : "Toda semana";
  if (r.frequency === "quinzenal") return dias ? `A cada 2 semanas — ${dias}` : "A cada 2 semanas";
  if (r.frequency === "mensal") return "Todo mês";
  return `A cada ${r.interval ?? 1} dia(s)`;
}
