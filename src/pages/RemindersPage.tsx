import { useState } from "react";
import { api } from "@/lib/api";
import { daysSince, formatDateBR } from "@/lib/format";
import { labelOf, PRIORITIES, REMINDER_STATUS, REMINDER_TYPES } from "@/lib/options";
import { useEntities } from "@/lib/useEntities";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";

const FIELDS: FieldDef[] = [
  { name: "title", label: "Título", required: true, colSpan: 2 },
  { name: "reminder_type", label: "Tipo", type: "select", options: REMINDER_TYPES, required: true },
  { name: "due_date", label: "Data", type: "date", required: true },
  { name: "time", label: "Horário (opcional)", type: "time" },
  { name: "priority", label: "Prioridade", type: "select", options: PRIORITIES },
  { name: "description", label: "Descrição administrativa", type: "textarea" },
];

export function RemindersPage() {
  const { items, loading, reload } = useEntities("reminders");
  const [open, setOpen] = useState(false);
  const toast = useToast();

  if (loading) return <Loading />;
  const pending = items
    .filter((r) => r.status === "pendente")
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const done = items.filter((r) => r.status !== "pendente");

  return (
    <div>
      <PageHeader title="Agenda e pendências">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Nova pendência
        </button>
      </PageHeader>

      <h2 className="mb-2 text-lg font-semibold">Pendentes</h2>
      {pending.length === 0 ? (
        <EmptyState text="Nenhuma pendência." />
      ) : (
        <ul className="space-y-2">
          {pending.map((r) => {
            const overdue = (daysSince(String(r.due_date)) ?? -1) > 0;
            return (
              <li key={r.id} className={`card flex items-center justify-between !py-2 ${overdue ? "border-amber-400" : ""}`}>
                <div>
                  <div className="font-medium">
                    {String(r.title)} <span className="badge ml-1">{labelOf(REMINDER_TYPES, r.reminder_type)}</span>
                    <span className="badge ml-1">{labelOf(PRIORITIES, r.priority)}</span>
                  </div>
                  <div className={`text-sm ${overdue ? "text-amber-700" : "text-base-700"}`}>
                    {formatDateBR(r.due_date as string)} {overdue ? "· atrasada" : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary !py-1 text-sm"
                    onClick={async () => {
                      await api.update("reminders", r.id, { ...r, status: "concluida", completed_at: new Date().toISOString() });
                      reload();
                    }}
                  >
                    Concluir
                  </button>
                  <button
                    className="btn-secondary !py-1 text-sm"
                    onClick={async () => {
                      await api.remove("reminders", r.id);
                      reload();
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-lg font-semibold">Concluídas / canceladas</h2>
          <ul className="space-y-1">
            {done.map((r) => (
              <li key={r.id} className="text-base-700">
                {formatDateBR(r.due_date as string)} — {String(r.title)} ({labelOf(REMINDER_STATUS, r.status)})
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova pendência" wide>
        <FormBuilder
          fields={FIELDS}
          initial={{ priority: "media" }}
          onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            await api.create("reminders", { ...v, status: "pendente" });
            toast("ok", "Pendência criada.");
            setOpen(false);
            reload();
          }}
        />
      </Modal>
    </div>
  );
}
