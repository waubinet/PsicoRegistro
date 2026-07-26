/**
 * Compromissos de uma pessoa/entidade: próximos e anteriores.
 * Usado no paciente, no caso, no estudante e na escola — sem duplicar dados,
 * apenas relacionando pelo id.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { agenda, nextEvent, pastEvents, type AgendaEvent } from "@/lib/agenda";
import { EVENT_STATUS, eventTypesFor } from "@/lib/agendaOptions";
import { todayISO } from "@/lib/agendaTime";
import { formatDateBR } from "@/lib/format";
import { labelOf } from "@/lib/options";

type Alvo =
  | { tipo: "paciente"; id: string }
  | { tipo: "estudante"; id: string }
  | { tipo: "caso"; id: string }
  | { tipo: "escola"; id: string };

export function AgendaDaPessoa(props: { alvo: Alvo; titulo?: string }) {
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const nav = useNavigate();
  const hoje = todayISO();

  useEffect(() => {
    const carregar =
      props.alvo.tipo === "paciente"
        ? agenda.ofPatient
        : props.alvo.tipo === "estudante"
          ? agenda.ofStudent
          : props.alvo.tipo === "caso"
            ? agenda.ofCase
            : agenda.ofSchool;
    carregar(props.alvo.id).then(setEventos).catch(() => setEventos([]));
  }, [props.alvo.tipo, props.alvo.id]);

  const proximo = nextEvent(eventos, hoje);
  const futuros = eventos
    .filter(
      (e) =>
        String(e.event_date ?? "") >= hoje &&
        !["cancelado", "realizado", "faltou"].includes(String(e.status)),
    )
    .sort((a, b) => `${a.event_date}${a.start_at}`.localeCompare(`${b.event_date}${b.start_at}`));
  const anteriores = pastEvents(eventos, hoje).slice(0, 8);

  const linha = (e: AgendaEvent) => (
    <li key={e.id} className="flex flex-wrap items-center gap-2 py-1">
      <span className="font-mono text-sm">
        {formatDateBR(e.event_date)} · {e.start_at}
      </span>
      <span>{labelOf(eventTypesFor(String(e.event_context)), e.event_type)}</span>
      <span className="badge">{labelOf(EVENT_STATUS, e.status)}</span>
      {(e.clinical_entry_id || e.school_record_id) && (
        <span className="badge" title="Registro vinculado">
          ✓ registro
        </span>
      )}
    </li>
  );

  if (eventos.length === 0) return null;

  return (
    <section className="card mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{props.titulo ?? "Agenda"}</h3>
        <button className="btn-secondary !py-1 text-sm" onClick={() => nav("/agenda")}>
          Abrir agenda
        </button>
      </div>

      {proximo && (
        <p className="mb-2 rounded-md border border-accent bg-accent-soft px-3 py-2 text-sm dark:bg-base-200">
          <strong>Próximo:</strong> {formatDateBR(proximo.event_date)} às {proximo.start_at} —{" "}
          {labelOf(eventTypesFor(String(proximo.event_context)), proximo.event_type)}
        </p>
      )}

      {futuros.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-base-700">Próximos atendimentos</h4>
          <ul>{futuros.slice(0, 6).map(linha)}</ul>
        </div>
      )}

      {anteriores.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-base-700">Atendimentos anteriores</h4>
          <ul>{anteriores.map(linha)}</ul>
        </div>
      )}
    </section>
  );
}
