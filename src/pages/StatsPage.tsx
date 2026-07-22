import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ExportDialog } from "@/components/ExportDialog";
import { PageHeader } from "@/components/ui";

type Group = { key: string; count: number };
const K_ANON = 3; // agrupamentos com menos que isto são suprimidos

function GroupTable(props: { title: string; rows: Group[]; labelMap?: Record<string, string> }) {
  const rows = props.rows ?? [];
  return (
    <div className="card">
      <h3 className="mb-2 font-semibold">{props.title}</h3>
      {rows.length === 0 ? (
        <p className="text-base-700">Sem dados.</p>
      ) : (
        <table className="table-base">
          <tbody>
            {rows.map((r) => {
              const suppressed = r.count < K_ANON;
              return (
                <tr key={r.key}>
                  <td>{props.labelMap?.[r.key] ?? r.key}</td>
                  <td className="text-right">
                    {suppressed ? (
                      <span title="Suprimido para evitar reidentificação">&lt; {K_ANON}</span>
                    ) : (
                      r.count
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function StatsPage() {
  const [s, setS] = useState<Record<string, unknown> | null>(null);
  const [schoolNames, setSchoolNames] = useState<Record<string, string>>({});
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    api.stats().then(setS).catch(() => undefined);
    api.list("schools").then((rows) => {
      const m: Record<string, string> = {};
      rows.forEach((r) => (m[r.id] = String(r.name)));
      setSchoolNames(m);
    });
  }, []);

  if (!s) return null;
  const g = (k: string) => (s[k] as Group[]) ?? [];
  const num = (k: string) => Number(s[k] ?? 0);

  return (
    <div>
      <PageHeader title="Estatísticas (anonimizadas)">
        <button className="btn-secondary" onClick={() => setExportOpen(true)}>
          Exportar relatório
        </button>
      </PageHeader>

      {exportOpen && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          title="Relatório estatístico anonimizado"
          exportType="relatorio_estatistico"
          targetKind="estatisticas"
          sections={[
            {
              title: "Totais",
              fields: [
                { label: "Casos ativos", value: String(num("active_cases")) },
                { label: "Pacientes", value: String(num("patients")) },
                { label: "Estudantes", value: String(num("students")) },
                { label: "Escolas ativas", value: String(num("schools")) },
              ],
            },
            {
              title: "Atividades escolares por tipo",
              fields: g("school_by_activity")
                .filter((r) => r.count >= K_ANON)
                .map((r) => ({ label: r.key, value: String(r.count) })),
            },
            {
              title: "Encaminhamentos por área",
              fields: g("referrals_by_area")
                .filter((r) => r.count >= K_ANON)
                .map((r) => ({ label: r.key, value: String(r.count) })),
            },
          ]}
        />
      )}
      <p className="mb-4 text-sm text-base-700">
        Relatórios agregados sem identificação nominal. Grupos com menos de {K_ANON} indivíduos são
        suprimidos para evitar reidentificação. Nenhum conteúdo clínico, nome, CPF, contato ou
        diagnóstico nominal é exibido.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card">
          <div className="text-3xl font-semibold">{num("active_cases")}</div>
          <div className="text-base-700">Casos ativos</div>
        </div>
        <div className="card">
          <div className="text-3xl font-semibold">{num("patients")}</div>
          <div className="text-base-700">Pacientes</div>
        </div>
        <div className="card">
          <div className="text-3xl font-semibold">{num("students")}</div>
          <div className="text-base-700">Estudantes</div>
        </div>
        <div className="card">
          <div className="text-3xl font-semibold">{num("schools")}</div>
          <div className="text-base-700">Escolas ativas</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GroupTable title="Atendimentos clínicos por mês" rows={g("entries_by_month")} />
        <GroupTable title="Registros escolares por mês" rows={g("school_by_month")} />
        <GroupTable title="Atividades escolares por tipo" rows={g("school_by_activity")} />
        <GroupTable title="Encaminhamentos por área" rows={g("referrals_by_area")} />
        <GroupTable title="Encaminhamentos por situação" rows={g("referrals_by_status")} />
        <GroupTable
          title="Estudantes por escola"
          rows={g("students_by_school")}
          labelMap={schoolNames}
        />
      </div>
    </div>
  );
}
