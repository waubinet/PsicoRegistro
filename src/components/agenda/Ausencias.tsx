/**
 * Férias, feriados e outros períodos de indisponibilidade.
 *
 * Marcar uma ausência **não altera compromissos existentes** — apenas destaca
 * os dias na agenda e avisa quantos atendimentos caem no período, deixando a
 * decisão (manter, cancelar ou remarcar) para o profissional.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { agenda, type AgendaEvent } from "@/lib/agenda";
import { ABSENCE_KINDS } from "@/lib/agendaOptions";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { labelOf } from "@/lib/options";
import { ConfirmDialog, EmptyState, Modal, useToast } from "@/components/ui";

/** A data está dentro de alguma ausência? Devolve a ausência encontrada. */
export function ausenciaDe(data: string, ausencias: Entity[]): Entity | null {
  return (
    ausencias.find(
      (a) => String(a.start_date ?? "") <= data && data <= String(a.end_date ?? a.start_date ?? ""),
    ) ?? null
  );
}

export function Ausencias(props: { open: boolean; onClose: () => void; onMudou?: () => void }) {
  const [lista, setLista] = useState<Entity[]>([]);
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const [kind, setKind] = useState("ferias");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [descricao, setDescricao] = useState("");
  const [confirmarCancelar, setConfirmarCancelar] = useState<Entity | null>(null);
  const toast = useToast();

  const carregar = useCallback(() => {
    api.list("agenda_absences").then(setLista).catch(() => setLista([]));
    agenda.all().then(setEventos).catch(() => setEventos([]));
  }, []);

  useEffect(() => {
    if (props.open) carregar();
  }, [props.open, carregar]);

  /** Compromissos ativos que caem dentro de cada ausência. */
  const afetados = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    for (const a of lista) {
      const ini = String(a.start_date ?? "");
      const f = String(a.end_date ?? ini);
      m.set(
        a.id,
        eventos.filter(
          (e) =>
            String(e.event_date ?? "") >= ini &&
            String(e.event_date ?? "") <= f &&
            ["agendado", "confirmado", "aguardando"].includes(String(e.status)),
        ),
      );
    }
    return m;
  }, [lista, eventos]);

  async function adicionar() {
    if (!inicio) {
      toast("error", "Informe a data inicial.");
      return;
    }
    try {
      await api.create("agenda_absences", {
        kind,
        start_date: inicio,
        end_date: fim || inicio,
        descricao,
      });
      toast("ok", "Período registrado.");
      setInicio("");
      setFim("");
      setDescricao("");
      carregar();
      props.onMudou?.();
    } catch (e) {
      toast("error", String(e));
    }
  }

  async function cancelarAtendimentos(a: Entity) {
    const alvos = afetados.get(a.id) ?? [];
    let n = 0;
    for (const e of alvos) {
      try {
        await agenda.update(e.id, { ...e, status: "cancelado" });
        n += 1;
      } catch {
        /* segue com os demais */
      }
    }
    toast("ok", `${n} atendimento(s) cancelado(s).`);
    carregar();
    props.onMudou?.();
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Férias, feriados e ausências" wide>
      <p className="mb-3 text-base-700">
        Marque períodos em que você não atende. Os compromissos já agendados{" "}
        <strong>não são alterados automaticamente</strong> — o app apenas avisa quantos caem no
        período, e você decide o que fazer.
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <div>
          <label className="label" htmlFor="au-tipo">
            Tipo
          </label>
          <select id="au-tipo" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {ABSENCE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="au-ini">
            De
          </label>
          <input
            id="au-ini"
            type="date"
            className="input"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="au-fim">
            Até (opcional)
          </label>
          <input
            id="au-fim"
            type="date"
            className="input"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
        <div className="md:col-span-1">
          <label className="label" htmlFor="au-desc">
            Descrição
          </label>
          <input
            id="au-desc"
            className="input"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={() => void adicionar()}>
            Adicionar
          </button>
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState text="Nenhum período registrado." />
      ) : (
        <ul className="space-y-2">
          {[...lista]
            .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
            .map((a) => {
              const alvos = afetados.get(a.id) ?? [];
              return (
                <li key={a.id} className="card flex flex-wrap items-center gap-2 !py-2">
                  <span className="badge">{labelOf(ABSENCE_KINDS, a.kind)}</span>
                  <span className="font-medium">
                    {formatDateBR(a.start_date as string)}
                    {a.end_date && a.end_date !== a.start_date
                      ? ` — ${formatDateBR(a.end_date as string)}`
                      : ""}
                  </span>
                  {a.descricao ? (
                    <span className="text-sm text-base-700">{String(a.descricao)}</span>
                  ) : null}
                  {alvos.length > 0 && (
                    <span className="badge border-amber-500">
                      {alvos.length} atendimento(s) neste período
                    </span>
                  )}
                  <span className="ml-auto flex gap-2">
                    {alvos.length > 0 && (
                      <button
                        className="btn-secondary !py-0.5 text-sm"
                        onClick={() => setConfirmarCancelar(a)}
                      >
                        Cancelar atendimentos
                      </button>
                    )}
                    <button
                      className="btn-secondary !py-0.5 text-sm"
                      onClick={async () => {
                        await api.remove("agenda_absences", a.id);
                        carregar();
                        props.onMudou?.();
                      }}
                    >
                      Remover
                    </button>
                  </span>
                </li>
              );
            })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmarCancelar !== null}
        onClose={() => setConfirmarCancelar(null)}
        onConfirm={() => confirmarCancelar && void cancelarAtendimentos(confirmarCancelar)}
        title="Cancelar atendimentos do período"
        message={
          <>
            {(afetados.get(confirmarCancelar?.id ?? "") ?? []).length} atendimento(s) serão marcados
            como <strong>cancelados</strong>. Os registros já feitos não são afetados, e você pode
            reagendar depois.
          </>
        }
        confirmLabel="Cancelar atendimentos"
        danger
      />

      <div className="mt-4 flex justify-end">
        <button className="btn-secondary" onClick={props.onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
