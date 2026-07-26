import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { daysSince, formatDateTimeBR } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { AgendaDeHoje } from "@/components/agenda/AgendaDeHoje";

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
  const [backupDays, setBackupDays] = useState(7);

  useEffect(() => {
    api.dashboard().then(setD).catch(() => undefined);
    api
      .settingsGet()
      .then((cfg) => setBackupDays(Number(cfg.backup_reminder_days) || 7))
      .catch(() => undefined);
  }, []);

  const n = (k: string) => Number(d?.[k] ?? 0);
  const lastBackup = d?.last_backup_at as string | undefined;
  const sinceBackup = daysSince(lastBackup);

  return (
    <div>
      <PageHeader title="Painel inicial" />

      <AgendaDeHoje />
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
          <p
            className={
              sinceBackup != null && sinceBackup > backupDays ? "text-amber-700" : "text-base-700"
            }
          >
            Último backup: {formatDateTimeBR(lastBackup)}
            {sinceBackup != null && ` (há ${sinceBackup} dia(s))`}
            {sinceBackup != null && sinceBackup > backupDays && " — recomendamos fazer um novo."}
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
