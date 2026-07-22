import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { ageFrom, formatDateBR } from "@/lib/format";
import {
  CASE_STATUS,
  CASE_TYPES,
  ENTRY_STATUS,
  labelOf,
  MODALITIES,
  PATIENT_STATUS,
} from "@/lib/options";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { ExportDialog } from "@/components/ExportDialog";
import { Timeline } from "@/components/Timeline";
import { ConfirmDialog, EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { PATIENT_FIELDS } from "./PatientsList";

const GUARDIAN_FIELDS: FieldDef[] = [
  { name: "name", label: "Nome do responsável", required: true, colSpan: 2 },
  { name: "relation", label: "Relação com o paciente" },
  { name: "phone", label: "Telefone" },
];

const CASE_FIELDS: FieldDef[] = [
  { name: "case_type", label: "Tipo", type: "select", options: CASE_TYPES, required: true },
  { name: "status", label: "Situação", type: "select", options: CASE_STATUS, required: true },
  { name: "start_date", label: "Data de início", type: "date" },
  { name: "end_date", label: "Data de encerramento", type: "date" },
  { name: "initial_demand", label: "Demanda inicial", type: "textarea" },
  { name: "demand_origin", label: "Origem da demanda" },
  { name: "modality", label: "Modalidade", type: "select", options: MODALITIES },
  { name: "goals", label: "Objetivos do trabalho", type: "textarea" },
  { name: "context", label: "Contexto", type: "textarea" },
  { name: "frequency", label: "Frequência prevista" },
  { name: "notes", label: "Observações", type: "textarea" },
  { name: "closure_reason", label: "Motivo de encerramento", type: "textarea" },
  { name: "final_referral", label: "Encaminhamento final", type: "textarea" },
];

export function PatientDetail() {
  const { id = "" } = useParams();
  const [patient, setPatient] = useState<Entity | null>(null);
  const [guardians, setGuardians] = useState<Entity[]>([]);
  const [cases, setCases] = useState<Entity[]>([]);
  const [entries, setEntries] = useState<Entity[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  const load = useCallback(() => {
    api.get("patients", id).then(setPatient).catch(() => setPatient(null));
    api.list("patient_guardians", [["patient_id", id]]).then(setGuardians).catch(() => undefined);
    api
      .list("clinical_cases", [["patient_id", id]])
      .then(async (cs) => {
        setCases(cs);
        // linha do tempo unificada do paciente: evoluções de todos os casos
        const all = await Promise.all(
          cs.map((c) => api.list("clinical_entries", [["case_id", c.id]]).catch(() => [])),
        );
        setEntries(all.flat());
      })
      .catch(() => undefined);
  }, [id]);

  useEffect(load, [load]);

  if (!patient) return <Loading />;
  const age = ageFrom(patient.birth_date as string);
  const isMinor = age != null && age < 18;

  const info: [string, string][] = [
    ["Telefone", String(patient.phone ?? "—")],
    ["E-mail", String(patient.email ?? "—")],
    ["Nascimento", formatDateBR(patient.birth_date as string)],
    ["Idade", age != null ? `${age} anos` : "—"],
    ["Ocupação", String(patient.occupation ?? "—")],
    ["Instituição", String(patient.institution ?? "—")],
    ["Contato de emergência", String(patient.emergency_contact ?? "—")],
    ["Situação", labelOf(PATIENT_STATUS, patient.status)],
  ];

  return (
    <div>
      <PageHeader title={String(patient.full_name)}>
        <button className="btn-secondary" onClick={() => setExportOpen(true)}>
          Resumo administrativo
        </button>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          Editar
        </button>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
          Excluir
        </button>
      </PageHeader>

      <div className="card mb-6 grid grid-cols-1 gap-2 md:grid-cols-2">
        {info.map(([k, v]) => (
          <div key={k}>
            <span className="text-base-700">{k}:</span> <span className="font-medium">{v}</span>
          </div>
        ))}
        {patient.admin_notes ? (
          <div className="md:col-span-2">
            <span className="text-base-700">Observações administrativas:</span>{" "}
            {String(patient.admin_notes)}
          </div>
        ) : null}
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Responsáveis legais</h2>
          <button className="btn-secondary !py-1 text-sm" onClick={() => setGuardianOpen(true)}>
            + Adicionar
          </button>
        </div>
        {isMinor && guardians.length === 0 && (
          <p className="mb-2 text-amber-700">
            Paciente menor de idade — cadastre ao menos um responsável.
          </p>
        )}
        {guardians.length === 0 ? (
          <EmptyState text="Nenhum responsável cadastrado." />
        ) : (
          <ul className="space-y-2">
            {guardians.map((g) => (
              <li key={g.id} className="card flex items-center justify-between !py-2">
                <span>
                  <strong>{String(g.name)}</strong>
                  {g.relation ? ` — ${g.relation}` : ""} {g.phone ? `· ${g.phone}` : ""}
                </span>
                <button
                  className="btn-secondary !py-1 text-sm"
                  onClick={() =>
                    api.remove("patient_guardians", g.id).then(load).catch(() => undefined)
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Processos / casos</h2>
          <button className="btn-primary !py-1 text-sm" onClick={() => setCaseOpen(true)}>
            + Novo caso
          </button>
        </div>
        {cases.length === 0 ? (
          <EmptyState text="Nenhum caso aberto." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {cases.map((c) => (
              <button
                key={c.id}
                className="card text-left hover:bg-base-200"
                onClick={() => nav(`/casos/${c.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{labelOf(CASE_TYPES, c.case_type)}</span>
                  <span className="badge">{labelOf(CASE_STATUS, c.status)}</span>
                </div>
                <div className="mt-1 text-sm text-base-700">
                  Início: {formatDateBR(c.start_date as string)}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">Linha do tempo do paciente</h2>
        <Timeline
          items={entries.map((e) => {
            const c = cases.find((x) => x.id === e.case_id);
            return {
              id: e.id,
              date: String(e.entry_date ?? e.created_at),
              type: labelOf(CASE_TYPES, c?.case_type),
              status: labelOf(ENTRY_STATUS, e.status),
              author: e.author as string,
              hasReferral: Boolean(e.referrals),
              hasAddendum: e.status === "corrigido",
              onOpen: () => e.case_id && nav(`/casos/${e.case_id}`),
            };
          })}
        />
      </section>

      {exportOpen && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          title="Resumo administrativo do paciente"
          exportType="resumo_administrativo"
          targetKind="patients"
          targetId={id}
          sections={[
            {
              title: "Identificação",
              fields: [
                { label: "Nome", value: String(patient.full_name ?? "") },
                { label: "Nascimento", value: formatDateBR(patient.birth_date as string) },
                { label: "Idade", value: age != null ? `${age} anos` : "" },
                { label: "Telefone", value: String(patient.phone ?? "") },
                { label: "E-mail", value: String(patient.email ?? "") },
                { label: "Situação", value: labelOf(PATIENT_STATUS, patient.status) },
              ],
            },
            {
              title: "Processos / casos",
              fields: cases.map((c) => ({
                label: labelOf(CASE_TYPES, c.case_type),
                value: `${labelOf(CASE_STATUS, c.status)} — início ${formatDateBR(c.start_date as string)}`,
              })),
            },
            {
              title: "Volume de registros",
              fields: [
                { label: "Total de evoluções", value: String(entries.length) },
                {
                  label: "Finalizadas",
                  value: String(entries.filter((e) => e.status !== "rascunho").length),
                },
              ],
            },
          ]}
        />
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar paciente" wide>
        <FormBuilder
          fields={PATIENT_FIELDS}
          initial={patient}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (v) => {
            await api.update("patients", id, v);
            toast("ok", "Paciente atualizado.");
            setEditOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal open={guardianOpen} onClose={() => setGuardianOpen(false)} title="Novo responsável">
        <FormBuilder
          fields={GUARDIAN_FIELDS}
          onCancel={() => setGuardianOpen(false)}
          onSubmit={async (v) => {
            await api.create("patient_guardians", { ...v, patient_id: id });
            setGuardianOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal open={caseOpen} onClose={() => setCaseOpen(false)} title="Novo caso / processo" wide>
        <FormBuilder
          fields={CASE_FIELDS}
          initial={{ status: "triagem", modality: "presencial" }}
          onCancel={() => setCaseOpen(false)}
          onSubmit={async (v) => {
            const cid = await api.create("clinical_cases", { ...v, patient_id: id });
            setCaseOpen(false);
            nav(`/casos/${cid}`);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await api.remove("patients", id);
          toast("ok", "Paciente movido para a lixeira.");
          nav("/pacientes");
        }}
        title="Excluir paciente"
        message="O paciente será movido para a lixeira (exclusão lógica). Você poderá restaurá-lo depois."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
