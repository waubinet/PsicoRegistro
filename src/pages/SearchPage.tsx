import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";

const ROUTE: Record<string, (id: string) => string> = {
  patients: (id) => `/pacientes/${id}`,
  students: (id) => `/estudantes/${id}`,
  schools: (id) => `/escolas/${id}`,
  clinical_cases: (id) => `/casos/${id}`,
  reminders: () => `/pendencias`,
};

export function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Record<string, string>[] | null>(null);
  const nav = useNavigate();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setResults(await api.search(q).catch(() => []));
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
                    if (route) nav(route(r.id));
                  }}
                >
                  <td className="font-medium">{r.name}</td>
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
