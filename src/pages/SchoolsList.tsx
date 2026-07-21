import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { labelOf, SCHOOL_NETWORKS } from "@/lib/options";
import { matchesLocal } from "@/lib/localSearch";
import { useEntities } from "@/lib/useEntities";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";

export const SCHOOL_FIELDS: FieldDef[] = [
  { name: "name", label: "Nome da escola", required: true, colSpan: 2 },
  { name: "network", label: "Rede", type: "select", options: SCHOOL_NETWORKS },
  { name: "inep_code", label: "Código INEP (opcional)" },
  { name: "address", label: "Endereço", colSpan: 2 },
  { name: "phone", label: "Telefone" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "principal", label: "Diretor(a)" },
  { name: "pedagogical_coordinator", label: "Coordenador(a) pedagógico(a)" },
  { name: "other_contacts", label: "Outros contatos relevantes", type: "textarea" },
  { name: "shifts", label: "Turnos atendidos" },
  { name: "service_days", label: "Dias de atendimento" },
  { name: "notes", label: "Observações institucionais", type: "textarea" },
  {
    name: "status",
    label: "Situação",
    type: "select",
    options: [
      { value: "ativa", label: "Ativa" },
      { value: "inativa", label: "Inativa" },
    ],
  },
];

export function SchoolsList() {
  const { items, loading, reload } = useEntities("schools");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const toast = useToast();

  const filtered = useMemo(
    () => items.filter((s) => !q || matchesLocal(String(s.name ?? ""), q)),
    [items, q],
  );

  return (
    <div>
      <PageHeader title="Psicologia Escolar — Escolas">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Nova escola
        </button>
      </PageHeader>

      <input
        className="input mb-4 max-w-xs"
        placeholder="Buscar escola…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState text="Nenhuma escola cadastrada." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <button
              key={s.id}
              className="card text-left hover:bg-base-200"
              onClick={() => nav(`/escolas/${s.id}`)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{String(s.name)}</span>
                <span className="badge">{labelOf(SCHOOL_NETWORKS, s.network)}</span>
              </div>
              <div className="mt-1 text-sm text-base-700">{String(s.address ?? "")}</div>
            </button>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova escola" wide>
        <FormBuilder
          fields={SCHOOL_FIELDS}
          initial={{ status: "ativa", network: "municipal" }}
          onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            const id = await api.create("schools", v);
            toast("ok", "Escola cadastrada.");
            setOpen(false);
            reload();
            nav(`/escolas/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
