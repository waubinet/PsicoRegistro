import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { ageFrom, formatDateBR } from "@/lib/format";
import { labelOf, PATIENT_STATUS } from "@/lib/options";
import { useEntities } from "@/lib/useEntities";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { EmptyState, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { matchesLocal } from "@/lib/localSearch";

export const PATIENT_FIELDS: FieldDef[] = [
  { name: "full_name", label: "Nome completo", required: true, colSpan: 2 },
  { name: "social_name", label: "Nome social" },
  { name: "birth_date", label: "Data de nascimento", type: "date" },
  { name: "cpf", label: "CPF (opcional)" },
  { name: "gender", label: "Gênero (opcional)" },
  { name: "pronoun", label: "Pronome (opcional)" },
  { name: "phone", label: "Telefone" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "address", label: "Endereço (opcional)", colSpan: 2 },
  { name: "occupation", label: "Profissão ou ocupação" },
  { name: "institution", label: "Escola ou instituição" },
  { name: "emergency_contact", label: "Contato de emergência" },
  { name: "emergency_relation", label: "Relação do contato" },
  { name: "admin_notes", label: "Observações administrativas", type: "textarea" },
  { name: "status", label: "Situação", type: "select", options: PATIENT_STATUS },
];

export function PatientsList() {
  const { items, loading, reload } = useEntities("patients");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const nav = useNavigate();
  const toast = useToast();

  const filtered = useMemo(
    () =>
      items.filter(
        (p) =>
          (!q || matchesLocal(`${p.full_name ?? ""} ${p.social_name ?? ""}`, q)) &&
          (!statusFilter || p.status === statusFilter),
      ),
    [items, q, statusFilter],
  );

  return (
    <div>
      <PageHeader title="Prontuário Psicológico — Pacientes">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Novo paciente
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Buscar por nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todas as situações</option>
          {PATIENT_STATUS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState text="Nenhum paciente cadastrado." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Idade</th>
                <th>Nascimento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const age = ageFrom(p.birth_date as string);
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => nav(`/pacientes/${p.id}`)}
                  >
                    <td className="font-medium">
                      {String(p.full_name)}
                      {p.social_name ? ` (${p.social_name})` : ""}
                      {p.is_demo ? <span className="badge ml-2">demo</span> : null}
                    </td>
                    <td>{age != null ? `${age} anos` : "—"}</td>
                    <td>{formatDateBR(p.birth_date as string)}</td>
                    <td>{labelOf(PATIENT_STATUS, p.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo paciente" wide>
        <FormBuilder
          fields={PATIENT_FIELDS}
          initial={{ status: "ativo" }}
          onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            try {
              const id = await api.create("patients", v);
              toast("ok", "Paciente cadastrado.");
              setOpen(false);
              reload();
              nav(`/pacientes/${id}`);
            } catch (e) {
              toast("error", String(e));
            }
          }}
        />
      </Modal>
    </div>
  );
}
