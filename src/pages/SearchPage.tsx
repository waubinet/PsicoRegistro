import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";

/** Rota do resultado. `parent` é usado quando o item vive dentro de outro. */
const ROUTE: Record<string, (id: string, parent: string) => string> = {
  patients: (id) => `/pacientes/${id}`,
  students: (id) => `/estudantes/${id}`,
  schools: (id) => `/escolas/${id}`,
  clinical_cases: (id) => `/casos/${id}`,
  clinical_entries: (_id, parent) => `/casos/${parent}`,
  school_records: (_id, parent) => `/estudantes/${parent}`,
  referrals: (_id, parent) => `/estudantes/${parent}`,
  institutional_school_records: (_id, parent) => `/escolas/${parent}`,
  reminders: () => `/pendencias`,
};

const KIND_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "patients", label: "Pacientes" },
  { value: "students", label: "Estudantes" },
  { value: "schools", label: "Escolas" },
  { value: "clinical_cases", label: "Casos clínicos" },
  { value: "clinical_entries", label: "Evoluções" },
  { value: "school_records", label: "Registros escolares" },
  { value: "institutional_school_records", label: "Ocorrências institucionais" },
  { value: "referrals", label: "Encaminhamentos" },
  { value: "reminders", label: "Pendências" },
];

export function SearchPage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState<Record<string, string>[] | null>(null);
  const nav = useNavigate();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const all = await api.search(q).catch(() => []);
    setResults(
      all.filter((r) => {
        if (kind && r.table !== kind) return false;
        if (status && !String(r.status ?? "").toLowerCase().includes(status.toLowerCase()))
          return false;
        const day = String(r.date ?? "").slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    );
  }

  return (
    <div>
      <PageHeader title="Pesquisa global" />
      <form onSubmit={run} className="mb-4 flex gap-2">
        <input
          className="input max-w-md"
          placeholder="Nome de paciente, estudante, escola…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button className="btn-primary" type="submit">
          Buscar
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="f-kind">
            Tipo
          </label>
          <select id="f-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-status">
            Situação contém
          </label>
          <input id="f-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-from">
            De
          </label>
          <input id="f-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-to">
            Até
          </label>
          <input id="f-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setKind("");
            setStatus("");
            setFrom("");
            setTo("");
          }}
        >
          Limpar filtros
        </button>
      </div>
      <p className="mb-4 text-sm text-base-700">
        Os resultados mostram apenas identificação administrativa — nunca conteúdo clínico.
      </p>

      {results === null ? null : results.length === 0 ? (
        <EmptyState text="Nenhum resultado. Digite ao menos 2 caracteres." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Onde</th>
                <th>Tipo</th>
                <th>Situação</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={i}
                  className="cursor-pointer"
                  onClick={() => {
                    const route = ROUTE[r.table];
                    if (route) nav(route(r.id, r.parent ?? ""));
                  }}
                >
                  <td className="font-medium">{r.name}</td>
                  <td className="text-base-700">{r.detail || "—"}</td>
                  <td>{r.kind}</td>
                  <td>{r.status ?? "—"}</td>
                  <td>{formatDateBR(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
