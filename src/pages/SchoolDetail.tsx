import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import {
  INSTITUTIONAL_TYPES,
  labelOf,
  SCHOOL_ACTIVITY_TYPES,
  SCHOOL_NETWORKS,
  STUDENT_STATUS,
} from "@/lib/options";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { ImportStudents } from "@/components/ImportStudents";
import { ViradaAnoLetivo } from "@/components/ViradaAnoLetivo";
import { ExportDialog } from "@/components/ExportDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { Timeline } from "@/components/Timeline";
import { AgendaDaPessoa } from "@/components/agenda/AgendaDaPessoa";
import { aberturaOcorrencia, PERIODOS } from "@/lib/dateExtenso";
import { gerarOcorrenciaPDF } from "@/lib/docOcorrencia";
import { writeFile } from "@/components/exportFile";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { relatorioEscola, resumoEscola, situacaoAluno } from "@/lib/schoolReport";
import { SCHOOL_FIELDS } from "./SchoolsList";

const SITUACAO_LABEL: Record<string, string> = {
  atendido: "Atendido",
  agendado: "Agendado",
  pendente: "Pendente",
};

const STUDENT_FIELDS: FieldDef[] = [
  { name: "full_name", label: "Nome completo", required: true, colSpan: 2 },
  { name: "social_name", label: "Nome social" },
  { name: "birth_date", label: "Data de nascimento", type: "date" },
  { name: "gender", label: "Gênero (opcional)" },
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

/** Ocorrência de visita: documento narrativo (formato oficial usado na rede). */
const OCORRENCIA_FIELDS: FieldDef[] = [
  { name: "record_date", label: "Data da visita", type: "date", required: true },
  { name: "period", label: "Período", type: "select", options: PERIODOS },
  {
    name: "narrative",
    label: "Relato da visita",
    type: "textarea",
    colSpan: 2,
    help: "Texto corrido, como no documento oficial. Use o botão acima para inserir a frase de abertura.",
  },
];

const INSTITUTIONAL_FIELDS: FieldDef[] = [
  { name: "record_type", label: "Tipo", type: "select", options: INSTITUTIONAL_TYPES, required: true },
  { name: "record_date", label: "Data", type: "date", required: true },
  { name: "location", label: "Local / setor visitado" },
  { name: "audience", label: "Turma ou público" },
  { name: "participants", label: "Participantes", type: "textarea" },
  { name: "demand", label: "Demanda / motivo da visita", type: "textarea" },
  { name: "objective", label: "Objetivo", type: "textarea" },
  { name: "situation", label: "Situação encontrada", type: "textarea" },
  { name: "activity", label: "Atividade realizada", type: "textarea" },
  { name: "measures", label: "Providências adotadas", type: "textarea" },
  { name: "results", label: "Resultados", type: "textarea" },
  { name: "referrals", label: "Encaminhamentos", type: "textarea" },
  { name: "next_actions", label: "Próximas ações", type: "textarea" },
];

/** Campos copiados ao usar uma ocorrência anterior como base (a data é redefinida). */
const TEMPLATE_FIELDS = [
  "record_type",
  "period",
  "narrative",
  "location",
  "audience",
  "participants",
  "demand",
  "objective",
  "situation",
  "activity",
  "measures",
  "results",
  "referrals",
  "next_actions",
];

function asTemplate(base: Entity | null): Record<string, unknown> {
  const out: Record<string, unknown> = {
    record_type: "ocorrencia_visita",
    record_date: new Date().toISOString().slice(0, 10),
  };
  if (base) {
    for (const f of TEMPLATE_FIELDS) {
      if (base[f]) out[f] = base[f];
    }
    out.record_date = new Date().toISOString().slice(0, 10);
  }
  return out;
}

export function SchoolDetail() {
  const { id = "" } = useParams();
  const [school, setSchool] = useState<Entity | null>(null);
  const [students, setStudents] = useState<Entity[]>([]);
  const [institutional, setInstitutional] = useState<Entity[]>([]);
  const [referrals, setReferrals] = useState<Entity[]>([]);
  const [records, setRecords] = useState<Entity[]>([]);
  const [reminders, setReminders] = useState<Entity[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [instEditing, setInstEditing] = useState<Entity | null>(null);
  const [instInitial, setInstInitial] = useState<Record<string, unknown>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [viradaOpen, setViradaOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [exportOcorrencia, setExportOcorrencia] = useState<Entity | null>(null);
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
    api.list("school_records", [["school_id", id]]).then(setRecords).catch(() => undefined);
    api.list("reminders").then(setReminders).catch(() => undefined);
  }, [id]);

  useEffect(load, [load]);
  if (!school) return <Loading />;

  const pendingReferrals = referrals.filter(
    (r) => !["concluido", "recusado"].includes(String(r.status)),
  );
  const resumo = resumoEscola(students, records, reminders);

  /** Ocorrência de visita sai no formato oficial (narrativo + assinaturas). */
  async function gerarDocumentoOcorrencia(r: Entity) {
    try {
      const perfil = (await api.list("professional_profiles").catch(() => []))[0] as
        | Record<string, unknown>
        | undefined;
      const data = String(r.record_date ?? "");
      const dest = await saveDialog({
        defaultPath: `OCORRENCIA DE VISITA - ${String(school?.name ?? "")} - ${data}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!dest) return;
      const bytes = gerarOcorrenciaPDF({
        escola: String(school?.name ?? ""),
        dataISO: data,
        narrativa: String(r.narrative ?? ""),
        cidade: String(perfil?.city ?? "Conceição do Araguaia"),
        profissional: perfil?.name ? String(perfil.name) : undefined,
        crp: perfil?.crp ? String(perfil.crp) : undefined,
      });
      await writeFile(dest, new Uint8Array(bytes));
      await api.exportLog("ocorrencia_visita", "institutional_school_records", r.id);
      toast("ok", "Documento gerado. Lembre-se: fora do app ele não está protegido.");
    } catch (e) {
      toast("error", `Falha ao gerar documento: ${String(e)}`);
    }
  }

  // Última ocorrência de visita desta escola — serve de modelo para a próxima.
  const lastOcorrencia =
    institutional
      .filter((r) => r.record_type === "ocorrencia_visita")
      .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)))[0] ?? null;

  // Agrupa alunos por ano/série (o "Nível" da planilha).
  const groups = new Map<string, Entity[]>();
  for (const s of students) {
    const g = String(s.grade || "Sem série");
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  return (
    <div>
      <PageHeader title={String(school.name)}>
        <button className="btn-secondary" onClick={() => setImportOpen(true)}>
          Importar lista
        </button>
        <button className="btn-secondary" onClick={() => setViradaOpen(true)}>
          Virada de ano
        </button>
        <button className="btn-secondary" onClick={() => setReportOpen(true)}>
          Relatório da escola
        </button>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          Editar
        </button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card !py-3">
          <div className="text-2xl font-semibold">{resumo.total}</div>
          <div className="text-sm text-base-700">Total de alunos</div>
        </div>
        <div className="card !py-3">
          <div className="text-2xl font-semibold text-accent">{resumo.atendidos}</div>
          <div className="text-sm text-base-700">✅ Atendidos</div>
        </div>
        <div className="card !py-3">
          <div className="text-2xl font-semibold">{resumo.agendados}</div>
          <div className="text-sm text-base-700">🕐 Agendados</div>
        </div>
        <div className="card !py-3">
          <div className="text-2xl font-semibold">{resumo.pendentes}</div>
          <div className="text-sm text-base-700">⬜ Pendentes</div>
        </div>
      </div>

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
          <EmptyState text="Nenhum estudante cadastrado. Use “Importar lista” para adicionar vários de uma vez." />
        ) : (
          [...groups.entries()].map(([grade, alunos]) => (
            <div key={grade} className="mb-4">
              <h3 className="mb-1 font-semibold text-base-800">
                ▸ {grade} <span className="text-sm font-normal text-base-700">({alunos.length})</span>
              </h3>
              <div className="card overflow-x-auto p-0">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Nome do aluno</th>
                      <th>Situação (atend.)</th>
                      <th>Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((s, i) => {
                      const sit = situacaoAluno(s.id, records, reminders);
                      return (
                        <tr key={s.id} className="cursor-pointer" onClick={() => nav(`/estudantes/${s.id}`)}>
                          <td className="text-base-700">{i + 1}</td>
                          <td className="font-medium">
                            {String(s.full_name)}
                            {s.is_demo ? <span className="badge ml-2">demo</span> : null}
                          </td>
                          <td>
                            <span className="badge">{SITUACAO_LABEL[sit]}</span>
                          </td>
                          <td>{labelOf(STUDENT_STATUS, s.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Ocorrências e registros institucionais</h2>
          <div className="flex gap-2">
            <button
              className="btn-primary !py-1 text-sm"
              title="Cria uma nova ocorrência já preenchida com o conteúdo da última desta escola"
              onClick={() => {
                setInstEditing(null);
                setInstInitial(asTemplate(lastOcorrencia));
                setInstOpen(true);
              }}
            >
              + Nova ocorrência de visita
            </button>
            <button
              className="btn-secondary !py-1 text-sm"
              onClick={() => {
                setInstEditing(null);
                setInstInitial({ record_date: new Date().toISOString().slice(0, 10) });
                setInstOpen(true);
              }}
            >
              + Outro registro
            </button>
          </div>
        </div>
        {lastOcorrencia && (
          <p className="mb-2 text-sm text-base-700">
            A nova ocorrência usa como base a de {formatDateBR(lastOcorrencia.record_date as string)} —
            é só ajustar o que mudou.
          </p>
        )}
        {institutional.length === 0 ? (
          <EmptyState text="Nenhuma ocorrência registrada." />
        ) : (
          <ul className="space-y-2">
            {institutional.map((r) => (
              <li key={r.id} className="card !py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{labelOf(INSTITUTIONAL_TYPES, r.record_type)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-base-700">{formatDateBR(r.record_date as string)}</span>
                    <button
                      className="btn-secondary !py-0.5 text-sm"
                      onClick={() => {
                        setInstEditing(r);
                        setInstInitial(r as Record<string, unknown>);
                        setInstOpen(true);
                      }}
                    >
                      Abrir
                    </button>
                    <button
                      className="btn-secondary !py-0.5 text-sm"
                      title="Criar uma nova ocorrência usando esta como base"
                      onClick={() => {
                        setInstEditing(null);
                        setInstInitial(asTemplate(r));
                        setInstOpen(true);
                      }}
                    >
                      Usar como base
                    </button>
                    <button
                      className="btn-secondary !py-0.5 text-sm"
                      onClick={() => {
                        if (r.record_type === "ocorrencia_visita") void gerarDocumentoOcorrencia(r);
                        else setExportOcorrencia(r);
                      }}
                    >
                      PDF
                    </button>
                  </div>
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

      {instOpen && (
        <Modal
          open
          onClose={() => setInstOpen(false)}
          title={instEditing ? "Editar ocorrência / registro" : "Nova ocorrência / registro"}
          wide
        >
          {instInitial.record_type === "ocorrencia_visita" && (
            <div className="mb-4 rounded-md border border-base-200 bg-base-100 p-3">
              <p className="mb-2 text-sm text-base-700">
                Documento narrativo. A abertura padrão pode ser inserida automaticamente:
              </p>
              <button
                className="btn-secondary !py-1 text-sm"
                onClick={() => {
                  const abertura = aberturaOcorrencia(
                    String(instInitial.record_date ?? new Date().toISOString().slice(0, 10)),
                    String(instInitial.period ?? ""),
                    String(school.name),
                  );
                  const atual = String(instInitial.narrative ?? "");
                  setInstInitial({
                    ...instInitial,
                    narrative: atual.startsWith("No dia") ? atual : `${abertura}\n\n${atual}`.trim(),
                  });
                }}
              >
                Inserir frase de abertura
              </button>
            </div>
          )}
          <FormBuilder
            key={JSON.stringify(instInitial.narrative ?? "")}
            fields={
              instInitial.record_type === "ocorrencia_visita"
                ? OCORRENCIA_FIELDS
                : INSTITUTIONAL_FIELDS
            }
            initial={instInitial}
            onCancel={() => setInstOpen(false)}
            onSubmit={async (v) => {
              // o tipo não aparece no formulário da ocorrência; preserva-o
              const payload = { ...v, record_type: instInitial.record_type ?? v.record_type };
              if (instEditing) {
                await api.update("institutional_school_records", instEditing.id, {
                  ...payload,
                  school_id: id,
                });
                toast("ok", "Registro atualizado.");
              } else {
                await api.create("institutional_school_records", { ...payload, school_id: id });
                toast("ok", "Ocorrência registrada.");
              }
              setInstOpen(false);
              load();
            }}
          />
        </Modal>
      )}

      <ImportStudents
        open={importOpen}
        onClose={() => setImportOpen(false)}
        schoolId={id}
        onImported={load}
      />

      <ViradaAnoLetivo
        open={viradaOpen}
        onClose={() => setViradaOpen(false)}
        schoolId={id}
        students={students}
        onDone={load}
      />

      <AgendaDaPessoa alvo={{ tipo: "escola", id }} titulo="Agenda desta escola" />

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">Linha do tempo da escola</h2>
        <Timeline
          items={[
            ...records.map((r) => ({
              id: r.id,
              date: String(r.record_date ?? r.created_at),
              type: labelOf(SCHOOL_ACTIVITY_TYPES, r.activity_type),
              status: String(r.status ?? ""),
              hasReferral: Boolean(r.referrals),
              onOpen: () => r.student_id && nav(`/estudantes/${r.student_id}`),
            })),
            ...institutional.map((r) => ({
              id: r.id,
              date: String(r.record_date ?? r.created_at),
              type: labelOf(INSTITUTIONAL_TYPES, r.record_type),
              onOpen: () => {
                setInstEditing(r);
                setInstInitial(r as Record<string, unknown>);
                setInstOpen(true);
              },
            })),
          ]}
        />
      </section>

      {exportOcorrencia && exportOcorrencia.record_type !== "ocorrencia_visita" && (
        <ExportDialog
          open
          onClose={() => setExportOcorrencia(null)}
          title={`${labelOf(INSTITUTIONAL_TYPES, exportOcorrencia.record_type)} — ${String(school.name)}`}
          exportType="registro_institucional"
          targetKind="institutional_school_records"
          targetId={exportOcorrencia.id}
          sections={[
            {
              title: `Registro de ${formatDateBR(exportOcorrencia.record_date as string)}`,
              fields: INSTITUTIONAL_FIELDS.filter((f) => f.name !== "record_type").map((f) => ({
                label: f.label,
                value: String(exportOcorrencia[f.name] ?? ""),
              })),
            },
          ]}
        />
      )}

      {reportOpen && (
        <ReportDialog
          open
          onClose={() => setReportOpen(false)}
          title={`Relatório — ${String(school.name)}`}
          exportType="relatorio_escola"
          targetKind="schools"
          targetId={id}
          build={(from, to) =>
            relatorioEscola(String(school.name), students, records, reminders, from, to)
          }
        />
      )}
    </div>
  );
}

export { STUDENT_FIELDS };
