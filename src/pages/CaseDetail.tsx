import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { entryFieldsFor } from "@/lib/entryFields";
import { CASE_STATUS, CASE_TYPES, ENTRY_STATUS, labelOf } from "@/lib/options";
import { FormBuilder } from "@/components/FormBuilder";
import { ExportDialog, type ExportSection } from "@/components/ExportDialog";
import { Timeline } from "@/components/Timeline";
import { ConfirmDialog, EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { NeuroPanel } from "./NeuroPanel";

const AUTOSAVE_MS = 3000;

export function CaseDetail() {
  const { id = "" } = useParams();
  const [caseRow, setCaseRow] = useState<Entity | null>(null);
  const [patient, setPatient] = useState<Entity | null>(null);
  const [entries, setEntries] = useState<Entity[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [timelineExport, setTimelineExport] = useState(false);
  const nav = useNavigate();

  const load = useCallback(() => {
    api.get("clinical_cases", id).then((c) => {
      setCaseRow(c);
      api.get("patients", String(c.patient_id)).then(setPatient).catch(() => undefined);
    });
    api.list("clinical_entries", [["case_id", id]]).then(setEntries).catch(() => undefined);
  }, [id]);

  useEffect(load, [load]);

  if (!caseRow) return <Loading />;
  const caseType = String(caseRow.case_type);
  const isNeuro = caseType === "avaliacao_neuropsicologica";

  return (
    <div>
      <PageHeader
        title={`${labelOf(CASE_TYPES, caseType)} — ${String(patient?.full_name ?? "")}`}
      >
        <button className="btn-secondary" onClick={() => setTimelineExport(true)}>
          Exportar linha do tempo
        </button>
        <button className="btn-secondary" onClick={() => nav(`/pacientes/${caseRow.patient_id}`)}>
          ← Paciente
        </button>
      </PageHeader>

      {timelineExport && (
        <ExportDialog
          open
          onClose={() => setTimelineExport(false)}
          title="Linha do tempo do processo"
          exportType="linha_do_tempo"
          targetKind="clinical_cases"
          targetId={id}
          sections={[
            {
              title: `${labelOf(CASE_TYPES, caseType)} — ${String(patient?.full_name ?? "")}`,
              fields: [...entries]
                .sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)))
                .map((e) => ({
                  label: formatDateBR(e.entry_date as string),
                  value: `${labelOf(ENTRY_STATUS, e.status)}${e.theme ? ` — ${e.theme}` : ""}`,
                })),
            },
          ]}
        />
      )}

      <CaseSummary caseRow={caseRow} onSaved={load} />

      {isNeuro ? (
        <NeuroPanel caseId={id} entries={entries} reload={load} />
      ) : (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Registros de evolução</h2>
            <button
              className="btn-primary !py-1 text-sm"
              onClick={() => {
                setSelected(null);
                setOpen(true);
              }}
            >
              + Novo registro
            </button>
          </div>
          {entries.length === 0 ? (
            <EmptyState text="Nenhum registro de evolução." />
          ) : (
            <Timeline
              items={entries.map((e) => ({
                id: e.id,
                date: String(e.entry_date ?? e.created_at),
                type: labelOf(CASE_TYPES, caseType),
                status: labelOf(ENTRY_STATUS, e.status),
                author: e.author as string,
                hasReferral: Boolean(e.referrals),
                hasAddendum: e.status === "corrigido",
                onOpen: () => {
                  setSelected(e);
                  setOpen(true);
                },
              }))}
            />
          )}
        </section>
      )}

      {open && (
        <EntryEditor
          caseId={id}
          caseType={caseType}
          entry={selected}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CaseSummary(props: { caseRow: Entity; onSaved: () => void }) {
  const c = props.caseRow;
  const [edit, setEdit] = useState(false);
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <span className="badge">{labelOf(CASE_STATUS, c.status)}</span>
        <button className="btn-secondary !py-1 text-sm" onClick={() => setEdit(!edit)}>
          {edit ? "Fechar" : "Editar caso"}
        </button>
      </div>
      {!edit ? (
        <div className="grid gap-1 md:grid-cols-2">
          <div>
            <span className="text-base-700">Início:</span> {formatDateBR(c.start_date as string)}
          </div>
          <div>
            <span className="text-base-700">Demanda:</span> {String(c.initial_demand ?? "—")}
          </div>
          <div className="md:col-span-2">
            <span className="text-base-700">Objetivos:</span> {String(c.goals ?? "—")}
          </div>
        </div>
      ) : (
        <FormBuilder
          fields={[
            { name: "status", label: "Situação", type: "select", options: CASE_STATUS },
            { name: "start_date", label: "Início", type: "date" },
            { name: "end_date", label: "Encerramento", type: "date" },
            { name: "initial_demand", label: "Demanda inicial", type: "textarea" },
            { name: "goals", label: "Objetivos", type: "textarea" },
            { name: "notes", label: "Observações", type: "textarea" },
            { name: "closure_reason", label: "Motivo de encerramento", type: "textarea" },
          ]}
          initial={c}
          onCancel={() => setEdit(false)}
          onSubmit={async (v) => {
            await api.update("clinical_cases", c.id, { ...c, ...v });
            setEdit(false);
            props.onSaved();
          }}
        />
      )}
    </div>
  );
}

function EntryEditor(props: {
  caseId: string;
  caseType: string;
  entry: Entity | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fields = useMemo(() => entryFieldsFor(props.caseType), [props.caseType]);
  const [entry, setEntry] = useState<Entity | null>(props.entry);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [addenda, setAddenda] = useState<Entity[]>([]);
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();
  const finalized = entry?.status === "finalizado" || entry?.status === "corrigido";

  useEffect(() => {
    if (entry?.id) {
      api
        .list("clinical_entry_addenda", [["entry_id", entry.id]])
        .then(setAddenda)
        .catch(() => undefined);
    }
  }, [entry?.id]);

  // Autosave de rascunho.
  useEffect(() => {
    if (finalized || Object.keys(draftValues).length === 0) return;
    const t = setTimeout(async () => {
      try {
        const payload = { ...draftValues, case_id: props.caseId, entry_type: props.caseType };
        if (entry?.id) {
          await api.update("clinical_entries", entry.id, { ...payload, status: entry.status ?? "rascunho" });
        } else {
          const id = await api.create("clinical_entries", { ...payload, status: "rascunho" });
          const created = await api.get("clinical_entries", id);
          setEntry(created);
        }
      } catch {
        /* silencioso; salvamento manual ainda disponível */
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(draftValues)]);

  const exportSections: ExportSection[] = entry
    ? [
        {
          title: "Registro de evolução",
          fields: fields
            .filter((f) => f.type !== "checkbox")
            .map((f) => ({ label: f.label, value: String(entry[f.name] ?? "") })),
        },
      ]
    : [];

  return (
    <Modal
      open
      onClose={props.onClose}
      title={entry?.id ? (finalized ? "Registro finalizado" : "Editar rascunho") : "Novo registro"}
      wide
    >
      {finalized && (
        <div className="mb-4 rounded-md border border-base-300 bg-base-100 p-3 text-base-800">
          Este registro está finalizado e não pode ser editado. Correções devem ser feitas por
          adendo, preservando o conteúdo original.
        </div>
      )}

      {finalized ? (
        <div className="space-y-2">
          {fields
            .filter((f) => f.type !== "checkbox" && entry?.[f.name])
            .map((f) => (
              <div key={f.name}>
                <span className="font-medium text-base-800">{f.label}:</span>{" "}
                <span className="whitespace-pre-wrap">{String(entry?.[f.name])}</span>
              </div>
            ))}

          {addenda.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold">Adendos</h4>
              {addenda.map((a) => (
                <div key={a.id} className="mt-2 rounded-md border border-base-200 p-2">
                  <div className="text-sm text-base-700">
                    {formatDateBR(a.created_at)} — motivo: {String(a.reason)}
                  </div>
                  <div className="whitespace-pre-wrap">{String(a.content)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button className="btn-secondary" onClick={() => setExportOpen(true)}>
              Exportar PDF
            </button>
            <button className="btn-primary" onClick={() => setAddendumOpen(true)}>
              Adicionar adendo
            </button>
          </div>
        </div>
      ) : (
        <FormBuilder
          fields={fields}
          initial={entry ?? {}}
          onChange={setDraftValues}
          submitLabel="Salvar rascunho"
          onCancel={props.onClose}
          footer={
            entry?.id ? (
              <button type="button" className="btn-secondary" onClick={() => setConfirmFinal(true)}>
                Finalizar registro
              </button>
            ) : undefined
          }
          onSubmit={async (v) => {
            const payload = { ...v, case_id: props.caseId, entry_type: props.caseType, status: "rascunho" };
            try {
              if (entry?.id) {
                await api.update("clinical_entries", entry.id, payload);
              } else {
                await api.create("clinical_entries", payload);
              }
              toast("ok", "Rascunho salvo.");
              props.onSaved();
            } catch (e) {
              toast("error", String(e));
            }
          }}
        />
      )}

      <ConfirmDialog
        open={confirmFinal}
        onClose={() => setConfirmFinal(false)}
        onConfirm={async () => {
          if (!entry?.id) return;
          await api.finalize("clinical_entries", entry.id);
          toast("ok", "Registro finalizado.");
          props.onSaved();
        }}
        title="Finalizar registro"
        message="Após finalizar, o registro não poderá ser editado — apenas corrigido por adendo. Confirmar?"
        confirmLabel="Finalizar"
      />

      {addendumOpen && entry?.id && (
        <AddendumDialog
          entryId={entry.id}
          onClose={() => setAddendumOpen(false)}
          onSaved={async () => {
            setAddendumOpen(false);
            const updated = await api.get("clinical_entries", entry.id);
            setEntry(updated);
            const list = await api.list("clinical_entry_addenda", [["entry_id", entry.id]]);
            setAddenda(list);
          }}
        />
      )}

      {exportOpen && entry && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          title="Evolução individual"
          exportType="evolucao"
          targetKind="clinical_entries"
          targetId={entry.id}
          sections={exportSections}
        />
      )}
    </Modal>
  );
}

function AddendumDialog(props: { entryId: string; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [content, setContent] = useState("");
  const toast = useToast();
  return (
    <Modal open onClose={props.onClose} title="Adendo ao registro">
      <label className="label">Motivo do adendo</label>
      <input className="input mb-3" value={reason} onChange={(e) => setReason(e.target.value)} />
      <label className="label">Conteúdo</label>
      <textarea
        className="input mb-4"
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={props.onClose}>
          Cancelar
        </button>
        <button
          className="btn-primary"
          disabled={!reason || !content}
          onClick={async () => {
            try {
              await api.addAddendum(props.entryId, reason, content);
              toast("ok", "Adendo registrado.");
              props.onSaved();
            } catch (e) {
              toast("error", String(e));
            }
          }}
        >
          Registrar adendo
        </button>
      </div>
    </Modal>
  );
}
