import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import {
  INSTITUTIONAL_TYPES,
  labelOf,
  SCHOOL_NETWORKS,
  STUDENT_STATUS,
} from "@/lib/options";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { SCHOOL_FIELDS } from "./SchoolsList";

const STUDENT_FIELDS: FieldDef[] = [
  { name: "full_name", label: "Nome completo", required: true, colSpan: 2 },
  { name: "social_name", label: "Nome social" },
  { name: "birth_date", label: "Data de nascimento", type: "date" },
  { name: "grade", label: "Ano ou série" },
  { name: "class_name", label: "Turma" },
  {
    name: "shift",
    label: "Turno",
    type: "select",
    options: [
      { value: "matutino", label: "Matutino" },
      { value: "vespertino", label: "Vespertino" },
      { value: "noturno", label: "Noturno" },
      { value: "integral", label: "Integral" },
    ],
  },
  { name: "enrollment", label: "Número de matrícula (opcional)" },
  { name: "homeroom_teacher", label: "Professor regente" },
  { name: "demand_origin", label: "Origem da demanda", type: "textarea" },
  { name: "first_contact_date", label: "Data do primeiro contato", type: "date" },
  { name: "status", label: "Situação", type: "select", options: STUDENT_STATUS },
  { name: "notes", label: "Observações", type: "textarea" },
  { name: "tags", label: "Marcadores (vírgula)" },
];

const INSTITUTIONAL_FIELDS: FieldDef[] = [
  { name: "record_type", label: "Tipo", type: "select", options: INSTITUTIONAL_TYPES, required: true },
  { name: "record_date", label: "Data", type: "date", required: true },
  { name: "audience", label: "Turma ou público" },
  { name: "participants", label: "Participantes", type: "textarea" },
  { name: "demand", label: "Demanda", type: "textarea" },
  { name: "objective", label: "Objetivo", type: "textarea" },
  { name: "activity", label: "Atividade realizada", type: "textarea" },
  { name: "results", label: "Resultados", type: "textarea" },
  { name: "referrals", label: "Encaminhamentos", type: "textarea" },
  { name: "next_actions", label: "Próximas ações", type: "textarea" },
];

export function SchoolDetail() {
  const { id = "" } = useParams();
  const [school, setSchool] = useState<Entity | null>(null);
  const [students, setStudents] = useState<Entity[]>([]);
  const [institutional, setInstitutional] = useState<Entity[]>([]);
  const [referrals, setReferrals] = useState<Entity[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  const load = useCallback(() => {
    api.get("schools", id).then(setSchool).catch(() => setSchool(null));
    api.list("students", [["school_id", id]]).then(setStudents).catch(() => undefined);
    api
      .list("institutional_school_records", [["school_id", id]])
      .then(setInstitutional)
      .catch(() => undefined);
    api.list("referrals", [["school_id", id]]).then(setReferrals).catch(() => undefined);
  }, [id]);

  useEffect(load, [load]);
  if (!school) return <Loading />;

  const pendingReferrals = referrals.filter(
    (r) => !["concluido", "recusado"].includes(String(r.status)),
  );

  return (
    <div>
      <PageHeader title={String(school.name)}>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          Editar
        </button>
      </PageHeader>

      <div className="card mb-6 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <span className="text-base-700">Rede:</span> {labelOf(SCHOOL_NETWORKS, school.network)}
        </div>
        <div>
          <span className="text-base-700">Telefone:</span> {String(school.phone ?? "—")}
        </div>
        <div>
          <span className="text-base-700">Diretor(a):</span> {String(school.principal ?? "—")}
        </div>
        <div>
          <span className="text-base-700">Coordenação:</span>{" "}
          {String(school.pedagogical_coordinator ?? "—")}
        </div>
        <div>
          <span className="text-base-700">Turnos:</span> {String(school.shifts ?? "—")}
        </div>
        <div>
          <span className="text-base-700">Encaminhamentos pendentes:</span>{" "}
          {pendingReferrals.length}
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Estudantes</h2>
          <button className="btn-primary !py-1 text-sm" onClick={() => setStudentOpen(true)}>
            + Novo estudante
          </button>
        </div>
        {students.length === 0 ? (
          <EmptyState text="Nenhum estudante cadastrado." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Série/Turma</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => nav(`/estudantes/${s.id}`)}
                  >
                    <td className="font-medium">
                      {String(s.full_name)}
                      {s.is_demo ? <span className="badge ml-2">demo</span> : null}
                    </td>
                    <td>
                      {String(s.grade ?? "—")} {s.class_name ? `· ${s.class_name}` : ""}
                    </td>
                    <td>{labelOf(STUDENT_STATUS, s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Registros institucionais</h2>
          <button className="btn-secondary !py-1 text-sm" onClick={() => setInstOpen(true)}>
            + Novo registro
          </button>
        </div>
        {institutional.length === 0 ? (
          <EmptyState text="Nenhum registro institucional." />
        ) : (
          <ul className="space-y-2">
            {institutional.map((r) => (
              <li key={r.id} className="card !py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{labelOf(INSTITUTIONAL_TYPES, r.record_type)}</span>
                  <span className="text-sm text-base-700">{formatDateBR(r.record_date as string)}</span>
                </div>
                {r.objective ? <div className="text-sm">{String(r.objective)}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar escola" wide>
        <FormBuilder
          fields={SCHOOL_FIELDS}
          initial={school}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (v) => {
            await api.update("schools", id, v);
            toast("ok", "Escola atualizada.");
            setEditOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal open={studentOpen} onClose={() => setStudentOpen(false)} title="Novo estudante" wide>
        <FormBuilder
          fields={STUDENT_FIELDS}
          initial={{ status: "aguardando" }}
          onCancel={() => setStudentOpen(false)}
          onSubmit={async (v) => {
            const sid = await api.create("students", { ...v, school_id: id });
            setStudentOpen(false);
            nav(`/estudantes/${sid}`);
          }}
        />
      </Modal>

      <Modal open={instOpen} onClose={() => setInstOpen(false)} title="Novo registro institucional" wide>
        <FormBuilder
          fields={INSTITUTIONAL_FIELDS}
          onCancel={() => setInstOpen(false)}
          onSubmit={async (v) => {
            await api.create("institutional_school_records", { ...v, school_id: id });
            toast("ok", "Registro institucional salvo.");
            setInstOpen(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

export { STUDENT_FIELDS };
