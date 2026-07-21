import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTimeBR } from "@/lib/format";
import { EmptyState, Loading, PageHeader } from "@/components/ui";

const EVENT_LABELS: Record<string, string> = {
  setup: "Criação de usuário",
  unlock: "Desbloqueio",
  lock: "Bloqueio",
  password_change: "Troca de senha",
  create: "Criação",
  update: "Alteração",
  access: "Acesso",
  finalize: "Finalização",
  addendum: "Adendo",
  status: "Mudança de situação",
  delete: "Exclusão (lixeira)",
  restore: "Restauração de registro",
  purge: "Exclusão definitiva",
  export: "Exportação",
  backup_create: "Criação de backup",
  backup_restore: "Restauração de backup",
  restricted_access: "Acesso à área restrita",
  attachment_add: "Anexo adicionado",
  attachment_export: "Anexo exportado",
  demo_seed: "Dados de demonstração",
  demo_clear: "Remoção de demonstração",
};

const ENTITY_LABELS: Record<string, string> = {
  patients: "Paciente",
  clinical_cases: "Caso clínico",
  clinical_entries: "Evolução",
  students: "Estudante",
  schools: "Escola",
  school_records: "Registro escolar",
  referrals: "Encaminhamento",
  restricted_neuropsych_records: "Registro restrito",
  attachments: "Anexo",
};

export function AuditPage() {
  const [events, setEvents] = useState<
    { id: string; event_type: string; entity_kind: string; entity_id: string | null; detail: string | null; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .auditList(300, 0, filter || undefined)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <PageHeader title="Histórico de auditoria" />
      <p className="mb-4 text-sm text-base-700">
        Registra operações (data, hora, tipo e identificador). Nunca contém conteúdo clínico,
        senhas, chaves ou textos de evolução.
      </p>
      <select className="input mb-4 max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">Todos os eventos</option>
        {Object.entries(EVENT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      {loading ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState text="Nenhum evento registrado." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Operação</th>
                <th>Entidade</th>
                <th>Identificador</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateTimeBR(e.created_at)}</td>
                  <td>{EVENT_LABELS[e.event_type] ?? e.event_type}</td>
                  <td>{ENTITY_LABELS[e.entity_kind] ?? e.entity_kind}</td>
                  <td className="font-mono text-xs">{e.entity_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
