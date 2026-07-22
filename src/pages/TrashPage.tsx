import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTimeBR } from "@/lib/format";
import { ConfirmDialog, EmptyState, Loading, PageHeader, useToast } from "@/components/ui";

const ENTITY_LABELS: Record<string, string> = {
  patients: "Paciente",
  clinical_cases: "Caso clínico",
  clinical_entries: "Evolução",
  students: "Estudante",
  schools: "Escola",
  school_records: "Registro escolar",
  referrals: "Encaminhamento",
  reminders: "Pendência",
  patient_guardians: "Responsável",
  attachments: "Anexo",
};

export function TrashPage() {
  const [items, setItems] = useState<{ entity_kind: string; entity_id: string; deleted_at: string }[] | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<{ kind: string; id: string } | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    api.trashList().then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  if (!items) return <Loading />;

  return (
    <div>
      <PageHeader title="Lixeira" />
      <p className="mb-4 text-sm text-base-700">
        Registros excluídos logicamente. A exclusão definitiva exige a senha-mestra e é
        irreversível. Nada é apagado automaticamente por tempo — a decisão é sempre do profissional.
      </p>

      {items.length === 0 ? (
        <EmptyState text="Lixeira vazia." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Identificador</th>
                <th>Excluído em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={`${it.entity_kind}-${it.entity_id}`}>
                  <td>{ENTITY_LABELS[it.entity_kind] ?? it.entity_kind}</td>
                  <td className="font-mono text-xs">{it.entity_id}</td>
                  <td>{formatDateTimeBR(it.deleted_at)}</td>
                  <td className="flex gap-2">
                    <button
                      className="btn-secondary !py-1 text-sm"
                      onClick={async () => {
                        await api.restore(it.entity_kind, it.entity_id);
                        toast("ok", "Registro restaurado.");
                        load();
                      }}
                    >
                      Restaurar
                    </button>
                    <button
                      className="btn-danger !py-1 text-sm"
                      onClick={() => setPurgeTarget({ kind: it.entity_kind, id: it.entity_id })}
                    >
                      Excluir definitivamente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        title="Exclusão definitiva"
        message="Esta ação é irreversível: o registro será apagado do banco e não poderá ser recuperado. Deseja continuar?"
        confirmLabel="Excluir definitivamente"
        danger
        onConfirm={async () => {
          if (!purgeTarget) return;
          try {
            await api.purge(purgeTarget.kind, purgeTarget.id);
            toast("ok", "Registro excluído definitivamente.");
            load();
          } catch (e) {
            toast("error", String(e));
          }
        }}
      />
    </div>
  );
}
