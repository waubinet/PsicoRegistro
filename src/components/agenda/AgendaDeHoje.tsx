/**
 * Seção "Hoje" do painel: compromissos do dia com ações rápidas, destacando o
 * próximo atendimento. Mostra apenas dado administrativo — nunca conteúdo clínico.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { agenda, type AgendaEvent } from "@/lib/agenda";
import { EVENT_STATUS, eventTypesFor, STATUS_STYLE } from "@/lib/agendaOptions";
import { todayISO } from "@/lib/agendaTime";
import { api, type Entity } from "@/lib/api";
import { labelOf } from "@/lib/options";
import { useToast } from "@/components/ui";

export function AgendaDeHoje() {
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const [escolas, setEscolas] = useState<Entity[]>([]);
  const nav = useNavigate();
  const toast = useToast();
  const hoje = todayISO();

  const carregar = useCallback(() => {
    agenda
      .range(hoje, hoje)
      .then(setEventos)
      .catch(() => setEventos([]));
  }, [hoje]);

  useEffect(() => {
    carregar();
    api.list("schools").then(setEscolas).catch(() => undefined);
  }, [carregar]);

  const nomeEscola = useMemo(() => {
    const m = new Map<string, string>();
    escolas.forEach((e) => m.set(e.id, String(e.name)));
    return m;
  }, [escolas]);

  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(
    agora.getMinutes(),
  ).padStart(2, "0")}`;
  const proximo = eventos.find(
    (e) =>
      String(e.start_at ?? "") >= horaAtual &&
      !["cancelado", "realizado", "faltou"].includes(String(e.status)),
  );

  async function marcar(e: AgendaEvent, status: string) {
    try {
      await agenda.update(e.id, { ...e, status });
      toast("ok", `Marcado como ${labelOf(EVENT_STATUS, status).toLowerCase()}.`);
      carregar();
    } catch (err) {
      toast("error", String(err));
    }
  }

  if (eventos.length === 0) {
    return (
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Hoje</h2>
          <button className="btn-secondary !py-1 text-sm" onClick={() => nav("/agenda")}>
            Abrir agenda
          </button>
        </div>
        <p className="mt-2 text-base-700">Nenhum compromisso agendado para hoje.</p>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Hoje — {eventos.length} compromisso(s)</h2>
        <button className="btn-secondary !py-1 text-sm" onClick={() => nav("/agenda")}>
          Abrir agenda
        </button>
      </div>
      <ul className="divide-y divide-base-200">
        {eventos.map((e) => {
          const ehProximo = proximo?.id === e.id;
          const escola = nomeEscola.get(String(e.school_id ?? "")) ?? "";
          const pendente =
            e.status === "realizado" && !e.clinical_entry_id && !e.school_record_id;
          return (
            <li
              key={e.id}
              className={`flex flex-wrap items-center gap-2 py-2 ${
                ehProximo ? "-mx-2 rounded-md bg-accent-soft px-2 dark:bg-base-200" : ""
              }`}
            >
              <span className="font-mono text-sm">{e.start_at}</span>
              <span className="font-medium">{String(e.title ?? "")}</span>
              <span className="text-sm text-base-700">
                {labelOf(eventTypesFor(String(e.event_context)), e.event_type)}
                {escola && ` · ${escola}`}
              </span>
              <span className={`badge ${STATUS_STYLE[String(e.status)] ?? ""}`}>
                {labelOf(EVENT_STATUS, e.status)}
              </span>
              {ehProximo && <span className="badge">próximo</span>}
              {pendente && <span className="badge">registro pendente</span>}
              <span className="ml-auto flex gap-1">
                {!["realizado", "cancelado", "faltou"].includes(String(e.status)) && (
                  <>
                    <button
                      className="btn-secondary !px-2 !py-0.5 text-xs"
                      onClick={() => void marcar(e, "realizado")}
                      title="Marcar como realizado"
                    >
                      ✓
                    </button>
                    <button
                      className="btn-secondary !px-2 !py-0.5 text-xs"
                      onClick={() => void marcar(e, "faltou")}
                      title="Registrar falta"
                    >
                      falta
                    </button>
                  </>
                )}
                <button className="btn-secondary !px-2 !py-0.5 text-xs" onClick={() => nav("/agenda")}>
                  abrir
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
