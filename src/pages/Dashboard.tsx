import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { daysSince, formatDateTimeBR } from "@/lib/format";
import { PageHeader } from "@/components/ui";

function Stat(props: { label: string; value: number | string; to?: string; warn?: boolean }) {
  const body = (
    <div className={`card ${props.warn ? "border-amber-400" : ""}`}>
      <div className="text-3xl font-semibold">{props.value}</div>
      <div className="mt-1 text-base-700">{props.label}</div>
    </div>
  );
  return props.to ? <Link to={props.to}>{body}</Link> : body;
}

export function Dashboard() {
  const [d, setD] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.dashboard().then(setD).catch(() => undefined);
  }, []);

  const n = (k: string) => Number(d?.[k] ?? 0);
  const lastBackup = d?.last_backup_at as string | undefined;
  const backupDays = daysSince(lastBackup);

  return (
    <div>
      <PageHeader title="Painel inicial" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Atendimentos (7 dias)" value={n("recent_entries") + n("recent_school")} />
        <Stat label="Registros em rascunho" value={n("drafts")} />
        <Stat label="Retornos pendentes" value={n("pending_reminders")} to="/pendencias" />
        <Stat
          label="Pendências atrasadas"
          value={n("overdue_reminders")}
          to="/pendencias"
          warn={n("overdue_reminders") > 0}
        />
        <Stat
          label="Encaminhamentos sem retorno"
          value={n("referrals_no_return")}
          to="/encaminhamentos"
          warn={n("referrals_no_return") > 0}
        />
        <Stat
          label="Avaliações neuropsicológicas em andamento"
          value={n("assessments_open")}
        />
      </div>

      <div className="mt-6 card">
        <h2 className="mb-2 font-semibold">Backup</h2>
        {lastBackup ? (
          <p className={backupDays != null && backupDays > 7 ? "text-amber-700" : "text-base-700"}>
            Último backup: {formatDateTimeBR(lastBackup)}
            {backupDays != null && ` (há ${backupDays} dia(s))`}
          </p>
        ) : (
          <p className="text-amber-700">
            Nenhum backup realizado ainda. Recomendamos criar um backup regularmente.
          </p>
        )}
        <Link to="/backup" className="btn-secondary mt-3 inline-flex !py-1 text-sm">
          Ir para Backup
        </Link>
      </div>
    </div>
  );
}
