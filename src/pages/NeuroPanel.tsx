import { useCallback, useEffect, useState } from "react";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { NEURO_SESSION_FIELDS } from "@/lib/entryFields";
import { NEURO_STAGES } from "@/lib/options";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { EmptyState, Modal, PasswordConfirm, useToast } from "@/components/ui";
import { useSession } from "@/store/session";

const SESSION_FIELDS: FieldDef[] = [
  { name: "stage", label: "Etapa", type: "select", options: NEURO_STAGES, required: true },
  { name: "session_date", label: "Data da sessão", type: "date" },
  ...NEURO_SESSION_FIELDS,
];

const RESTRICTED_FIELDS: FieldDef[] = [
  { name: "instrument_name", label: "Nome do instrumento", required: true, colSpan: 2 },
  { name: "edition", label: "Edição" },
  { name: "applied_date", label: "Data de aplicação", type: "date" },
  { name: "application_form", label: "Forma de aplicação" },
  {
    name: "scores",
    label: "Escores (digitados pelo psicólogo)",
    type: "textarea",
    help: "Digite apenas os escores obtidos. Não reproduza itens, estímulos ou pranchas do teste.",
  },
  { name: "classifications", label: "Classificações (digitadas pelo psicólogo)", type: "textarea" },
  { name: "technical_notes", label: "Observações técnicas", type: "textarea" },
];

export function NeuroPanel(props: { caseId: string; entries: Entity[]; reload: () => void }) {
  const { restricted, refresh } = useSession();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const toast = useToast();

  return (
    <div className="mt-6 space-y-8">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sessões de avaliação (por etapa)</h2>
          <button
            className="btn-primary !py-1 text-sm"
            onClick={() => {
              setEditing(null);
              setSessionOpen(true);
            }}
          >
            + Nova sessão
          </button>
        </div>
        <ol className="grid gap-2">
          {NEURO_STAGES.map((stage) => {
            const list = props.entries.filter((e) => e.stage === stage.value);
            return (
              <li key={stage.value} className="card !py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{stage.label}</span>
                  <span className="badge">{list.length} registro(s)</span>
                </div>
                {list.map((e) => (
                  <button
                    key={e.id}
                    className="mt-1 block w-full rounded border border-base-200 p-2 text-left text-sm hover:bg-base-200"
                    onClick={() => {
                      setEditing(e);
                      setSessionOpen(true);
                    }}
                  >
                    {formatDateBR(e.session_date as string)} — {String(e.objective ?? "sessão")}
                  </button>
                ))}
              </li>
            );
          })}
        </ol>
      </section>

      <RestrictedArchive caseId={props.caseId} unlocked={restricted} onUnlockChange={refresh} />

      {sessionOpen && (
        <Modal
          open
          onClose={() => setSessionOpen(false)}
          title={editing ? "Editar sessão de avaliação" : "Nova sessão de avaliação"}
          wide
        >
          <FormBuilder
            fields={SESSION_FIELDS}
            initial={editing ?? { session_date: "" }}
            onCancel={() => setSessionOpen(false)}
            onSubmit={async (v) => {
              const payload = { ...v, case_id: props.caseId, entry_type: "avaliacao_neuropsicologica", status: "finalizado" };
              try {
                if (editing) await api.update("clinical_entries", editing.id, payload);
                else await api.create("clinical_entries", payload);
                toast("ok", "Sessão registrada.");
                setSessionOpen(false);
                props.reload();
              } catch (e) {
                toast("error", String(e));
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function RestrictedArchive(props: {
  caseId: string;
  unlocked: boolean;
  onUnlockChange: () => Promise<void>;
}) {
  const [records, setRecords] = useState<Entity[]>([]);
  const [askPw, setAskPw] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    if (!props.unlocked) return;
    api
      .list("restricted_neuropsych_records", [["case_id", props.caseId]])
      .then(setRecords)
      .catch(() => setRecords([]));
  }, [props.caseId, props.unlocked]);

  useEffect(load, [load]);

  return (
    <section className="rounded-lg border-2 border-amber-400 bg-amber-50/40 p-4 dark:bg-amber-950/20">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-semibold">🔒 Arquivo Neuropsicológico Restrito</h2>
        {props.unlocked ? (
          <button
            className="btn-secondary !py-1 text-sm"
            onClick={async () => {
              await api.restrictedLock();
              await props.onUnlockChange();
            }}
          >
            Bloquear área
          </button>
        ) : (
          <button className="btn-primary !py-1 text-sm" onClick={() => setAskPw(true)}>
            Desbloquear (confirmar senha)
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-base-700">
        Área separada do prontuário geral. Guarde apenas escores e classificações digitados por
        você. Não reproduza itens, estímulos, pranchas ou qualquer conteúdo protegido de testes.
        Este material não entra em exportações comuns.
      </p>

      {!props.unlocked ? (
        <p className="text-base-700">Conteúdo oculto. Confirme sua senha para acessar.</p>
      ) : (
        <>
          <button className="btn-secondary !py-1 text-sm" onClick={() => setFormOpen(true)}>
            + Novo registro restrito
          </button>
          <div className="mt-3">
            {records.length === 0 ? (
              <EmptyState text="Nenhum registro restrito." />
            ) : (
              <ul className="space-y-2">
                {records.map((r) => (
                  <li key={r.id} className="card !py-2">
                    <div className="font-medium">{String(r.instrument_name)}</div>
                    <div className="text-sm text-base-700">
                      {r.edition ? `${r.edition} · ` : ""}
                      {formatDateBR(r.applied_date as string)}
                    </div>
                    {r.scores ? (
                      <div className="mt-1 whitespace-pre-wrap text-sm">Escores: {String(r.scores)}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <PasswordConfirm
        open={askPw}
        onClose={() => setAskPw(false)}
        title="Acessar área restrita"
        message="Confirme sua senha-mestra para acessar o Arquivo Neuropsicológico Restrito. O acesso é registrado na auditoria e expira automaticamente."
        onConfirm={async (pw) => {
          try {
            await api.restrictedUnlock(pw);
            await props.onUnlockChange();
            toast("ok", "Área restrita desbloqueada.");
          } catch (e) {
            toast("error", String(e));
          }
        }}
      />

      {formOpen && (
        <Modal open onClose={() => setFormOpen(false)} title="Novo registro restrito" wide>
          <FormBuilder
            fields={RESTRICTED_FIELDS}
            onCancel={() => setFormOpen(false)}
            onSubmit={async (v) => {
              try {
                await api.create("restricted_neuropsych_records", { ...v, case_id: props.caseId });
                toast("ok", "Registro restrito salvo.");
                setFormOpen(false);
                load();
              } catch (e) {
                toast("error", String(e));
              }
            }}
          />
        </Modal>
      )}
    </section>
  );
}
