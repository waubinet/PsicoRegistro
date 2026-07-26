/**
 * Acesso à agenda: monta/lê eventos e resolve os vínculos com pacientes,
 * casos, estudantes e escolas. Fica sobre o CRUD genérico já existente —
 * a agenda não tem backend próprio, usa `entities` como todo o resto.
 */
import { api, type Entity } from "./api";
import { addMinutes, durationOf, type Slot } from "./agendaTime";
import { defaultDuration } from "./agendaOptions";

export type AgendaEvent = Entity & {
  event_context?: string;
  event_type?: string;
  status?: string;
  event_date?: string;
  start_at?: string;
  end_at?: string;
  title?: string;
  location?: string;
  administrative_note?: string;
  patient_id?: string;
  clinical_case_id?: string;
  student_id?: string;
  school_id?: string;
  class_id?: string;
  referral_id?: string;
  clinical_entry_id?: string;
  school_record_id?: string;
  recurrence_id?: string;
  import_batch_id?: string;
  neuro_stage?: string;
  origin?: string;
};

/** Converte o evento para o formato usado na detecção de conflitos. */
export function toSlot(e: AgendaEvent): Slot & { id: string; status?: string } {
  return {
    id: e.id,
    date: String(e.event_date ?? ""),
    start: String(e.start_at ?? ""),
    end: String(e.end_at ?? ""),
    status: e.status,
  };
}

export function eventDuration(e: AgendaEvent): number {
  return durationOf(String(e.start_at ?? ""), String(e.end_at ?? ""));
}

/** Fim sugerido a partir do início e do tipo (duração padrão administrativa). */
export function suggestedEnd(start: string, eventType: string): string {
  return addMinutes(start, defaultDuration(eventType));
}

export const agenda = {
  /** Eventos de um intervalo de datas (inclusive). */
  async range(from: string, to: string): Promise<AgendaEvent[]> {
    const todos = (await api.list("agenda_events").catch(() => [])) as AgendaEvent[];
    return todos
      .filter((e) => {
        const d = String(e.event_date ?? "");
        return d >= from && d <= to;
      })
      .sort((a, b) =>
        `${a.event_date} ${a.start_at}`.localeCompare(`${b.event_date} ${b.start_at}`),
      );
  },

  async all(): Promise<AgendaEvent[]> {
    return (await api.list("agenda_events").catch(() => [])) as AgendaEvent[];
  },

  async ofPatient(patientId: string): Promise<AgendaEvent[]> {
    return (await api
      .list("agenda_events", [["patient_id", patientId]])
      .catch(() => [])) as AgendaEvent[];
  },

  async ofStudent(studentId: string): Promise<AgendaEvent[]> {
    return (await api
      .list("agenda_events", [["student_id", studentId]])
      .catch(() => [])) as AgendaEvent[];
  },

  async ofSchool(schoolId: string): Promise<AgendaEvent[]> {
    return (await api
      .list("agenda_events", [["school_id", schoolId]])
      .catch(() => [])) as AgendaEvent[];
  },

  async ofCase(caseId: string): Promise<AgendaEvent[]> {
    return (await api
      .list("agenda_events", [["clinical_case_id", caseId]])
      .catch(() => [])) as AgendaEvent[];
  },

  create: (data: Record<string, unknown>) => api.create("agenda_events", data),
  update: (id: string, data: Record<string, unknown>) => api.update("agenda_events", id, data),
  remove: (id: string) => api.remove("agenda_events", id),
  get: (id: string) => api.get("agenda_events", id) as Promise<AgendaEvent>,
};

/** Próximo evento futuro (a partir de hoje) de uma pessoa. */
export function nextEvent(eventos: AgendaEvent[], hojeISO: string): AgendaEvent | null {
  const futuros = eventos
    .filter(
      (e) =>
        String(e.event_date ?? "") >= hojeISO &&
        !["cancelado", "realizado", "faltou"].includes(String(e.status)),
    )
    .sort((a, b) =>
      `${a.event_date} ${a.start_at}`.localeCompare(`${b.event_date} ${b.start_at}`),
    );
  return futuros[0] ?? null;
}

/** Eventos passados já realizados. */
export function pastEvents(eventos: AgendaEvent[], hojeISO: string): AgendaEvent[] {
  return eventos
    .filter((e) => String(e.event_date ?? "") < hojeISO || e.status === "realizado")
    .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)));
}

/** Resumo da semana para o painel. */
export function weekSummary(eventos: AgendaEvent[]) {
  const total = eventos.length;
  const realizados = eventos.filter((e) => e.status === "realizado").length;
  const cancelados = eventos.filter((e) => e.status === "cancelado").length;
  const faltas = eventos.filter((e) => e.status === "faltou").length;
  const restantes = eventos.filter((e) =>
    ["agendado", "confirmado", "aguardando"].includes(String(e.status)),
  ).length;
  // realizados sem registro clínico/escolar vinculado
  const semRegistro = eventos.filter(
    (e) => e.status === "realizado" && !e.clinical_entry_id && !e.school_record_id,
  );
  return { total, realizados, cancelados, faltas, restantes, semRegistro };
}
