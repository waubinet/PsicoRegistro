import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { daysSince, formatDateBR } from "@/lib/format";
import { labelOf, REFERRAL_AREAS, REFERRAL_STATUS } from "@/lib/options";
import { ExportDialog } from "@/components/ExportDialog";
import { EmptyState, Loading, PageHeader } from "@/components/ui";

const OPEN_STATUS = ["planejado", "responsavel_orientado", "entregue", "agendado", "em_acompanhamento", "sem_retorno"];

export function ReferralsPage() {
  const [items, setItems] = useState<Entity[] | null>(null);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"pendentes" | "todos">("pendentes");
  const [exportOpen, setExportOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.list("referrals").then(setItems).catch(() => setItems([]));
    api.list("students").then((rows) => {
      const map: Record<string, string> = {};
      rows.forEach((s) => (map[s.id] = String(s.full_name)));
      setStudents(map);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (tab === "todos") return items;
    return items.filter((r) => OPEN_STATUS.includes(String(r.status)));
  }, [items, tab]);

  if (!items) return <Loading />;

  return (
    <div>
      <PageHeader title="Encaminhamentos">
        <button className="btn-secondary" onClick={() => setExportOpen(true)}>
          Exportar histórico
        </button>
      </PageHeader>

      {exportOpen && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          title="Histórico de encaminhamentos"
          exportType="historico_encaminhamentos"
          targetKind="referrals"
          sections={[
            {
              title: tab === "todos" ? "Todos os encaminhamentos" : "Encaminhamentos pendentes",
              fields: filtered.map((r) => ({
                label: `${formatDateBR(r.referral_date as string)} — ${students[String(r.student_id)] ?? "—"}`,
                value: `${labelOf(REFERRAL_AREAS, r.area)} · ${labelOf(REFERRAL_STATUS, r.status)}${
                  r.destination ? ` · ${r.destination}` : ""
                }`,
              })),
            },
          ]}
        />
      )}
      <div className="mb-4 flex gap-2">
        <button
          className={tab === "pendentes" ? "btn-primary !py-1" : "btn-secondary !py-1"}
          onClick={() => setTab("pendentes")}
        >
          Pendentes e atrasados
        </button>
        <button
          className={tab === "todos" ? "btn-primary !py-1" : "btn-secondary !py-1"}
          onClick={() => setTab("todos")}
        >
          Todos
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Nenhum encaminhamento nesta visão." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Estudante</th>
                <th>Área</th>
                <th>Data</th>
                <th>Situação</th>
                <th>Próxima verificação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overdue =
                  r.next_check_date && (daysSince(String(r.next_check_date)) ?? -1) > 0;
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => r.student_id && nav(`/estudantes/${r.student_id}`)}
                  >
                    <td className="font-medium">{students[String(r.student_id)] ?? "—"}</td>
                    <td>{labelOf(REFERRAL_AREAS, r.area)}</td>
                    <td>{formatDateBR(r.referral_date as string)}</td>
                    <td>{labelOf(REFERRAL_STATUS, r.status)}</td>
                    <td className={overdue ? "font-medium text-amber-700" : ""}>
                      {formatDateBR(r.next_check_date as string)}
                      {overdue ? " ⚠" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
