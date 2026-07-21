import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import {
  ENTRY_STATUS,
  labelOf,
  REFERRAL_AREAS,
  REFERRAL_STATUS,
  SCHOOL_ACTIVITY_TYPES,
  STUDENT_STATUS,
  THIRD_PARTY_TYPES,
} from "@/lib/options";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { ExportDialog, type ExportSection } from "@/components/ExportDialog";
import { Timeline } from "@/components/Timeline";
import { ConfirmDialog, EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { STUDENT_FIELDS } from "./SchoolDetail";

const RECORD_FIELDS: FieldDef[] = [
  { name: "record_date", label: "Data", type: "date", required: true },
  { name: "time", label: "Horário", type: "time" },
  { name: "location", label: "Local" },
  { name: "activity_type", label: "Tipo de atividade", type: "select", options: SCHOOL_ACTIVITY_TYPES, required: true },
  { name: "demand_origin", label: "Origem da demanda" },
  { name: "requester", label: "Solicitante" },
  { name: "participants", label: "Participantes" },
  { name: "situation", label: "Descrição sucinta da situação", type: "textarea" },
  { name: "objective", label: "Objetivo", type: "textarea" },
  { name: "performed", label: "O que foi realizado", type: "textarea" },
  { name: "guidance", label: "Orientações fornecidas", type: "textarea" },
  { name: "contacts_made", label: "Contatos feitos", type: "textarea" },
  { name: "immediate_result", label: "Resultado imediato", type: "textarea" },
  { name: "next_actions", label: "Próximas ações", type: "textarea" },
  { name: "followup_date", label: "Data de acompanhamento", type: "date" },
  { name: "referrals", label: "Encaminhamentos", type: "textarea" },
  {
    name: "restriction_level",
    label: "Nível de restrição",
    type: "select",
    options: [
      { value: "padrao", label: "Padrão" },
      { value: "sensivel", label: "Sensível" },
    ],
  },
];

// Campos adicionais quando o tipo envolve terceiros (responsáveis/professores/coordenação).
const THIRD_PARTY_FIELDS: FieldDef[] = [
  {
    name: "participant_name",
    label: "Nome do participante",
    showIf: (v) => THIRD_PARTY_TYPES.includes(String(v.activity_type)),
  },
  {
    name: "participant_role",
    label: "Função ou relação",
    showIf: (v) => THIRD_PARTY_TYPES.includes(String(v.activity_type)),
  },
  {
    name: "contact_means",
    label: "Meio de contato",
    showIf: (v) => THIRD_PARTY_TYPES.includes(String(v.activity_type)),
  },
  {
    name: "topics",
    label: "Assuntos necessários discutidos",
    type: "textarea",
    showIf: (v) => THIRD_PARTY_TYPES.includes(String(v.activity_type)),
  },
  {
    name: "agreements",
    label: "Combinações",
    type: "textarea",
    showIf: (v) => THIRD_PARTY_TYPES.includes(String(v.activity_type)),
  },
  {
    name: "return_date",
    label: "Data prevista para retorno",
    type: "date",
    showIf: (v) => THIRD_PARTY_TYPES.includes(String(v.activity_type)),
  },
];

const REFERRAL_FIELDS: FieldDef[] = [
  { name: "referral_date", label: "Data", type: "date", required: true },
  { name: "destination", label: "Serviço ou profissional de destino", colSpan: 2 },
  { name: "area", label: "Área", type: "select", options: REFERRAL_AREAS, required: true },
  { name: "reason", label: "Motivo sucinto", type: "textarea" },
  { name: "guardian_informed", label: "Responsável comunicado" },
  { name: "communication_method", label: "Forma de comunicação" },
  { name: "document_issued", label: "Documento emitido" },
  { name: "status", label: "Situação", type: "select", options: REFERRAL_STATUS, required: true },
  { name: "return_date", label: "Data do retorno", type: "date" },
  { name: "result", label: "Resultado informado", type: "textarea" },
  { name: "notes", label: "Observações", type: "textarea" },
  { name: "next_check_date", label: "Próxima verificação", type: "date" },
];

export function StudentDetail() {
  const { id = "" } = useParams();
  const [student, setStudent] = useState<Entity | null>(null);
  const [records, setRecords] = useState<Entity[]>([]);
  const [referrals, setReferrals] = useState<Entity[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Entity | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  const load = useCallback(() => {
    api.get("students", id).then(setStudent).catch(() => setStudent(null));
    api.list("school_records", [["student_id", id]]).then(setRecords).catch(() => undefined);
    api.list("referrals", [["student_id", id]]).then(setReferrals).catch(() => undefined);
  }, [id]);

  useEffect(load, [load]);

  const recordFields = useMemo(() => [...RECORD_FIELDS, ...THIRD_PARTY_FIELDS], []);
  const historySections: ExportSection[] = useMemo(
    () => [
      {
        title: "Histórico escolar do estudante",
        fields: records.map((r) => ({
          label: `${formatDateBR(r.record_date as string)} — ${labelOf(SCHOOL_ACTIVITY_TYPES, r.activity_type)}`,
          value: String(r.performed ?? r.situation ?? ""),
        })),
      },
    ],
    [records],
  );

  if (!student) return <Loading />;

  return (
    <div>
      <PageHeader title={String(student.full_name)}>
        <button className="btn-secondary" onClick={() => nav(`/escolas/${student.school_id}`)}>
          ← Escola
        </button>
        <button className="btn-secondary" onClick={() => setExportOpen(true)}>
          Exportar histórico
        </button>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          Editar
        </button>
      </PageHeader>

      <div className="card mb-6 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <span className="text-base-700">Série/Turma:</span> {String(student.grade ?? "—")}{" "}
          {student.class_name ? `· ${student.class_name}` : ""}
        </div>
        <div>
          <span className="text-base-700">Situação:</span> {labelOf(STUDENT_STATUS, student.status)}
        </div>
        <div>
          <span className="text-base-700">Professor regente:</span>{" "}
          {String(student.homeroom_teacher ?? "—")}
        </div>
        <div>
          <span className="text-base-700">Primeiro contato:</span>{" "}
          {formatDateBR(student.first_contact_date as string)}
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Registros de atividade</h2>
          <button
            className="btn-primary !py-1 text-sm"
            onClick={() => {
              setSelectedRecord(null);
              setRecordOpen(true);
            }}
          >
            + Novo registro
          </button>
        </div>
        {records.length === 0 ? (
          <EmptyState text="Nenhum registro." />
        ) : (
          <Timeline
            items={records.map((r) => ({
              id: r.id,
              date: String(r.record_date ?? r.created_at),
              type: labelOf(SCHOOL_ACTIVITY_TYPES, r.activity_type),
              status: labelOf(ENTRY_STATUS, r.status),
              hasReferral: Boolean(r.referrals),
              onOpen: () => {
                setSelectedRecord(r);
                setRecordOpen(true);
              },
            }))}
          />
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Encaminhamentos</h2>
          <button className="btn-secondary !py-1 text-sm" onClick={() => setReferralOpen(true)}>
            + Novo encaminhamento
          </button>
        </div>
        {referrals.length === 0 ? (
          <EmptyState text="Nenhum encaminhamento." />
        ) : (
          <ul className="space-y-2">
            {referrals.map((r) => (
              <li key={r.id} className="card !py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{labelOf(REFERRAL_AREAS, r.area)}</span>
                  <span className="badge">{labelOf(REFERRAL_STATUS, r.status)}</span>
                </div>
                <div className="text-sm text-base-700">
                  {formatDateBR(r.referral_date as string)} — {String(r.destination ?? "")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar estudante" wide>
        <FormBuilder
          fields={STUDENT_FIELDS}
          initial={student}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (v) => {
            await api.update("students", id, { ...v, school_id: student.school_id });
            toast("ok", "Estudante atualizado.");
            setEditOpen(false);
            load();
          }}
        />
      </Modal>

      {recordOpen && (
        <RecordEditor
          studentId={id}
          schoolId={String(student.school_id)}
          fields={recordFields}
          record={selectedRecord}
          onClose={() => setRecordOpen(false)}
          onSaved={() => {
            setRecordOpen(false);
            load();
          }}
        />
      )}

      <Modal open={referralOpen} onClose={() => setReferralOpen(false)} title="Novo encaminhamento" wide>
        <FormBuilder
          fields={REFERRAL_FIELDS}
          initial={{ status: "planejado" }}
          onCancel={() => setReferralOpen(false)}
          onSubmit={async (v) => {
            await api.create("referrals", {
              ...v,
              student_id: id,
              school_id: student.school_id,
            });
            toast("ok", "Encaminhamento registrado.");
            setReferralOpen(false);
            load();
          }}
        />
      </Modal>

      {exportOpen && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          title="Histórico escolar individual"
          exportType="historico_escolar"
          targetKind="students"
          targetId={id}
          sections={historySections}
        />
      )}
    </div>
  );
}

function RecordEditor(props: {
  studentId: string;
  schoolId: string;
  fields: FieldDef[];
  record: Entity | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [current, setCurrent] = useState<Entity | null>(props.record);
  const toast = useToast();
  const finalized = current?.status === "finalizado" || current?.status === "corrigido";

  return (
    <Modal open onClose={props.onClose} title={finalized ? "Registro finalizado" : "Registro de atividade"} wide>
      {finalized ? (
        <div className="space-y-2">
          {props.fields
            .filter((f) => current?.[f.name])
            .map((f) => (
              <div key={f.name}>
                <span className="font-medium">{f.label}:</span>{" "}
                <span className="whitespace-pre-wrap">{String(current?.[f.name])}</span>
              </div>
            ))}
          <p className="mt-3 text-sm text-base-700">
            Registro finalizado — não editável.
          </p>
        </div>
      ) : (
        <FormBuilder
          fields={props.fields}
          initial={current ?? { restriction_level: "padrao" }}
          onCancel={props.onClose}
          submitLabel="Salvar rascunho"
          footer={
            current?.id ? (
              <button type="button" className="btn-secondary" onClick={() => setConfirmFinal(true)}>
                Finalizar
              </button>
            ) : undefined
          }
          onSubmit={async (v) => {
            const payload = {
              ...v,
              student_id: props.studentId,
              school_id: props.schoolId,
              status: "rascunho",
            };
            try {
              if (current?.id) await api.update("school_records", current.id, payload);
              else {
                const id = await api.create("school_records", payload);
                setCurrent(await api.get("school_records", id));
              }
              toast("ok", "Registro salvo.");
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
          if (!current?.id) return;
          await api.finalize("school_records", current.id);
          toast("ok", "Registro finalizado.");
          props.onSaved();
        }}
        title="Finalizar registro"
        message="Após finalizar, o registro não poderá ser editado. Confirmar?"
        confirmLabel="Finalizar"
      />
    </Modal>
  );
}
