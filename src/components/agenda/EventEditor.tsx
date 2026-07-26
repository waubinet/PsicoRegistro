/**
 * Editor de compromisso. Concentra os vínculos (paciente/caso/estudante/escola),
 * a recorrência e as ações rápidas — inclusive "Registrar atendimento", que leva
 * os dados administrativos prontos para a evolução ou o registro escolar.
 *
 * A agenda guarda apenas dado administrativo; conteúdo clínico vive no prontuário.
 */
import { useEffect, useMemo, useState } from "react";
import { agenda, suggestedEnd, toSlot, type AgendaEvent } from "@/lib/agenda";
import {
  EVENT_CONTEXTS,
  EVENT_STATUS,
  eventTypesFor,
  NEURO_STAGES_EVENT,
  RECURRENCE_FREQUENCIES,
} from "@/lib/agendaOptions";
import { expandRecurrence, findConflicts } from "@/lib/agendaTime";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { labelOf } from "@/lib/options";
import { ConfirmDialog, Modal, useToast } from "@/components/ui";
import { PersonPicker, type PessoaEscolhida } from "./PersonPicker";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Evento existente (edição) ou nulo (criação). */
  event: AgendaEvent | null;
  /** Pré-preenchimento ao clicar num espaço vazio da grade. */
  seed?: { date: string; start: string };
  todosEventos: AgendaEvent[];
  onSaved: () => void;
  onRegistrar: (e: AgendaEvent) => void;
};

export function EventEditor(props: Props) {
  const toast = useToast();
  const [context, setContext] = useState("clinica");
  const [tipo, setTipo] = useState("psicoterapia");
  const [status, setStatus] = useState("agendado");
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");
  const [nota, setNota] = useState("");
  const [etapa, setEtapa] = useState("");
  const [pessoa, setPessoa] = useState<PessoaEscolhida | null>(null);
  const [escolas, setEscolas] = useState<Entity[]>([]);
  const [escolaId, setEscolaId] = useState("");
  const [confirmarConflito, setConfirmarConflito] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // recorrência (só na criação)
  const [repetir, setRepetir] = useState(false);
  const [freq, setFreq] = useState("semanal");
  const [intervalo, setIntervalo] = useState(1);
  const [ate, setAte] = useState("");
  const [ocorrencias, setOcorrencias] = useState(0);

  const editando = Boolean(props.event?.id);

  useEffect(() => {
    if (!props.open) return;
    api.list("schools").then(setEscolas).catch(() => undefined);
    const e = props.event;
    if (e) {
      setContext(String(e.event_context ?? "clinica"));
      setTipo(String(e.event_type ?? ""));
      setStatus(String(e.status ?? "agendado"));
      setData(String(e.event_date ?? ""));
      setInicio(String(e.start_at ?? ""));
      setFim(String(e.end_at ?? ""));
      setTitulo(String(e.title ?? ""));
      setLocal(String(e.location ?? ""));
      setNota(String(e.administrative_note ?? ""));
      setEtapa(String(e.neuro_stage ?? ""));
      setEscolaId(String(e.school_id ?? ""));
      if (e.patient_id || e.student_id) {
        setPessoa({
          patient_id: e.patient_id,
          student_id: e.student_id,
          school_id: e.school_id,
          class_id: e.class_id,
          clinical_case_id: e.clinical_case_id,
          nome: String(e.title ?? "(vinculado)"),
        });
      } else {
        setPessoa(null);
      }
    } else {
      setContext("clinica");
      setTipo("psicoterapia");
      setStatus("agendado");
      setData(props.seed?.date ?? "");
      setInicio(props.seed?.start ?? "08:00");
      setFim(suggestedEnd(props.seed?.start ?? "08:00", "psicoterapia"));
      setTitulo("");
      setLocal("");
      setNota("");
      setEtapa("");
      setEscolaId("");
      setPessoa(null);
      setRepetir(false);
    }
  }, [props.open, props.event, props.seed]);

  // nome da pessoa vira o título quando o título está vazio
  const tituloEfetivo = titulo.trim() || pessoa?.nome || labelOf(eventTypesFor(context), tipo);

  const conflitos = useMemo(() => {
    if (!data || !inicio || !fim) return [];
    return findConflicts(
      { date: data, start: inicio, end: fim },
      props.todosEventos.map(toSlot),
      props.event?.id,
    );
  }, [data, inicio, fim, props.todosEventos, props.event?.id]);

  function payload(dataEvento: string, recurrenceId?: string): Record<string, unknown> {
    return {
      event_context: context,
      event_type: tipo,
      status,
      event_date: dataEvento,
      start_at: inicio,
      end_at: fim,
      title: tituloEfetivo,
      location: local,
      administrative_note: nota,
      neuro_stage: context === "clinica" ? etapa : "",
      patient_id: pessoa?.patient_id ?? "",
      clinical_case_id: pessoa?.clinical_case_id ?? "",
      student_id: pessoa?.student_id ?? "",
      school_id: pessoa?.school_id || escolaId || "",
      class_id: pessoa?.class_id ?? "",
      recurrence_id: recurrenceId ?? props.event?.recurrence_id ?? "",
      origin: props.event?.origin ?? "manual",
      // vínculos com registros são preservados
      clinical_entry_id: props.event?.clinical_entry_id ?? "",
      school_record_id: props.event?.school_record_id ?? "",
    };
  }

  async function salvar(ignorarConflito = false) {
    if (!data || !inicio || !fim) {
      toast("error", "Informe data, início e fim.");
      return;
    }
    if (conflitos.length > 0 && !ignorarConflito) {
      setConfirmarConflito(true);
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await agenda.update(props.event!.id, payload(data));
        toast("ok", "Compromisso atualizado.");
      } else if (repetir) {
        // cria a série: um registro de recorrência + eventos materializados
        const recId = await api.create("agenda_recurrences", {
          frequency: freq,
          interval_n: String(intervalo),
          days_of_week: String(new Date(`${data}T00:00:00`).getDay()),
          start_date: data,
          end_date: ate,
          count_n: ocorrencias ? String(ocorrencias) : "",
        });
        const datas = expandRecurrence({
          frequency: freq as "semanal" | "quinzenal" | "mensal" | "personalizado",
          interval: intervalo,
          startDate: data,
          endDate: ate || undefined,
          count: ocorrencias || undefined,
        });
        for (const d of datas) await agenda.create(payload(d, recId));
        toast("ok", `Série criada: ${datas.length} compromisso(s).`);
      } else {
        await agenda.create(payload(data));
        toast("ok", "Compromisso agendado.");
      }
      props.onSaved();
      props.onClose();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(novo: string) {
    if (!props.event?.id) return;
    try {
      await agenda.update(props.event.id, { ...props.event, status: novo });
      toast("ok", `Marcado como ${labelOf(EVENT_STATUS, novo).toLowerCase()}.`);
      props.onSaved();
      props.onClose();
    } catch (e) {
      toast("error", String(e));
    }
  }

  const temRegistro = Boolean(props.event?.clinical_entry_id || props.event?.school_record_id);

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={editando ? "Compromisso" : "Novo compromisso"}
      wide
    >
      {/* ações rápidas (só na edição) */}
      {editando && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-base-200 bg-base-100 p-3">
          <button className="btn-primary !py-1 text-sm" onClick={() => props.onRegistrar(props.event!)}>
            {temRegistro ? "Abrir registro" : "Registrar atendimento"}
          </button>
          <button className="btn-secondary !py-1 text-sm" onClick={() => void mudarStatus("realizado")}>
            Marcar realizado
          </button>
          <button className="btn-secondary !py-1 text-sm" onClick={() => void mudarStatus("faltou")}>
            Registrar falta
          </button>
          <button className="btn-secondary !py-1 text-sm" onClick={() => void mudarStatus("cancelado")}>
            Cancelar
          </button>
          {props.event?.patient_id && (
            <a className="btn-secondary !py-1 text-sm" href={`#/pacientes/${props.event.patient_id}`}>
              Abrir paciente
            </a>
          )}
          {props.event?.clinical_case_id && (
            <a className="btn-secondary !py-1 text-sm" href={`#/casos/${props.event.clinical_case_id}`}>
              Abrir caso
            </a>
          )}
          {props.event?.student_id && (
            <a className="btn-secondary !py-1 text-sm" href={`#/estudantes/${props.event.student_id}`}>
              Abrir estudante
            </a>
          )}
        </div>
      )}

      {temRegistro && (
        <p className="mb-3 rounded-md border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          ✓ Registro vinculado a este compromisso.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="ev-ctx">
            Contexto
          </label>
          <select
            id="ev-ctx"
            className="input"
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              const t = eventTypesFor(e.target.value)[0]?.value ?? "";
              setTipo(t);
              setPessoa(null);
              if (inicio) setFim(suggestedEnd(inicio, t));
            }}
          >
            {EVENT_CONTEXTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="ev-tipo">
            Tipo
          </label>
          <select
            id="ev-tipo"
            className="input"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              if (inicio) setFim(suggestedEnd(inicio, e.target.value));
            }}
          >
            {eventTypesFor(context).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {context !== "outro" && (
          <div className="md:col-span-2">
            <label className="label">
              {context === "clinica" ? "Paciente" : "Estudante"}
            </label>
            <PersonPicker
              context={context === "clinica" ? "clinica" : "escolar"}
              valor={pessoa}
              onChange={setPessoa}
            />
          </div>
        )}

        {context === "escolar" && !pessoa && (
          <div className="md:col-span-2">
            <label className="label" htmlFor="ev-escola">
              Escola (atividade sem estudante específico)
            </label>
            <select
              id="ev-escola"
              className="input"
              value={escolaId}
              onChange={(e) => setEscolaId(e.target.value)}
            >
              <option value="">— nenhuma —</option>
              {escolas.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.name)}
                </option>
              ))}
            </select>
          </div>
        )}

        {context === "clinica" && tipo === "avaliacao_neuropsicologica" && (
          <div className="md:col-span-2">
            <label className="label" htmlFor="ev-etapa">
              Etapa da avaliação
            </label>
            <select
              id="ev-etapa"
              className="input"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
            >
              <option value="">— selecione —</option>
              {NEURO_STAGES_EVENT.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="ev-data">
            Data
          </label>
          <input
            id="ev-data"
            type="date"
            className="input"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ev-ini">
              Início
            </label>
            <input
              id="ev-ini"
              type="time"
              className="input"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value);
                setFim(suggestedEnd(e.target.value, tipo));
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="ev-fim">
              Fim
            </label>
            <input
              id="ev-fim"
              type="time"
              className="input"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ev-status">
            Situação
          </label>
          <select
            id="ev-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {EVENT_STATUS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ev-local">
            Local
          </label>
          <input
            id="ev-local"
            className="input"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="label" htmlFor="ev-titulo">
            Título (opcional — usa o nome da pessoa se vazio)
          </label>
          <input
            id="ev-titulo"
            className="input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="label" htmlFor="ev-nota">
            Observação administrativa (curta)
          </label>
          <input
            id="ev-nota"
            className="input"
            value={nota}
            maxLength={140}
            onChange={(e) => setNota(e.target.value)}
          />
          <p className="mt-1 text-sm text-base-700">
            Só informação administrativa. Conteúdo clínico vai no prontuário.
          </p>
        </div>
      </div>

      {/* recorrência apenas na criação */}
      {!editando && (
        <div className="mt-4 rounded-md border border-base-200 p-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} />
            <span className="font-medium">Repetir</span>
          </label>
          {repetir && (
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div>
                <label className="label">Frequência</label>
                <select className="input" value={freq} onChange={(e) => setFreq(e.target.value)}>
                  {RECURRENCE_FREQUENCIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {freq === "personalizado" && (
                <div>
                  <label className="label">A cada (dias)</label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={intervalo}
                    onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              )}
              <div>
                <label className="label">Até (opcional)</label>
                <input
                  type="date"
                  className="input"
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Ou nº de vezes</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={ocorrencias || ""}
                  onChange={(e) => setOcorrencias(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {conflitos.length > 0 && (
        <p className="mt-3 rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠ Já existe {conflitos.length} compromisso(s) neste horário.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {editando && (
          <button className="btn-danger mr-auto" onClick={() => setConfirmarExclusao(true)}>
            Excluir
          </button>
        )}
        <button className="btn-secondary" onClick={props.onClose}>
          Cancelar
        </button>
        <button className="btn-primary" disabled={salvando} onClick={() => void salvar()}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmarConflito}
        onClose={() => setConfirmarConflito(false)}
        onConfirm={() => void salvar(true)}
        title="Conflito de horário"
        message={
          <>
            Já existe compromisso neste horário:
            <ul className="mt-2 list-disc pl-5">
              {conflitos.slice(0, 4).map((c) => (
                <li key={c.id}>
                  {formatDateBR(c.date)} — {c.start} às {c.end}
                </li>
              ))}
            </ul>
            <p className="mt-2">Deseja agendar mesmo assim?</p>
          </>
        }
        confirmLabel="Agendar mesmo assim"
      />

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={async () => {
          if (!props.event?.id) return;
          await agenda.remove(props.event.id);
          toast("ok", "Compromisso excluído.");
          props.onSaved();
          props.onClose();
        }}
        title="Excluir compromisso"
        message="O compromisso vai para a lixeira. Registros já criados a partir dele não são afetados."
        confirmLabel="Excluir"
        danger
      />
    </Modal>
  );
}
