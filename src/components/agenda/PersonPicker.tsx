/**
 * Busca de pessoa para o compromisso. Pesquisa entre pacientes (contexto
 * clínico) ou estudantes (contexto escolar) e devolve os vínculos que puderem
 * ser inferidos com segurança — escola, turma, turno, caso ativo.
 *
 * Nada é inferido sobre conteúdo clínico: só dado administrativo.
 */
import { useEffect, useMemo, useState } from "react";
import { api, type Entity } from "@/lib/api";
import { matchesLocal } from "@/lib/localSearch";

export type PessoaEscolhida = {
  patient_id?: string;
  student_id?: string;
  school_id?: string;
  class_id?: string;
  clinical_case_id?: string;
  nome: string;
  /** Contexto administrativo (série, escola, turno) para exibição. */
  detalhe?: string;
};

export function PersonPicker(props: {
  context: "clinica" | "escolar";
  valor?: PessoaEscolhida | null;
  onChange: (p: PessoaEscolhida | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const [pacientes, setPacientes] = useState<Entity[]>([]);
  const [estudantes, setEstudantes] = useState<Entity[]>([]);
  const [escolas, setEscolas] = useState<Entity[]>([]);
  const [casos, setCasos] = useState<Entity[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (props.context === "clinica") {
      api.list("patients").then(setPacientes).catch(() => undefined);
      api.list("clinical_cases").then(setCasos).catch(() => undefined);
    } else {
      api.list("students").then(setEstudantes).catch(() => undefined);
      api.list("schools").then(setEscolas).catch(() => undefined);
    }
  }, [props.context]);

  const nomeEscola = useMemo(() => {
    const m = new Map<string, string>();
    escolas.forEach((e) => m.set(e.id, String(e.name)));
    return m;
  }, [escolas]);

  const resultados = useMemo(() => {
    const q = busca.trim();
    if (q.length < 1) return [];
    if (props.context === "clinica") {
      return pacientes
        .filter((p) => matchesLocal(`${p.full_name ?? ""} ${p.social_name ?? ""}`, q))
        .slice(0, 8)
        .map((p) => ({
          patient_id: p.id,
          nome: String(p.full_name),
          detalhe: String(p.status ?? ""),
        }));
    }
    return estudantes
      .filter((s) =>
        matchesLocal(
          `${s.full_name ?? ""} ${s.grade ?? ""} ${s.class_name ?? ""} ${
            nomeEscola.get(String(s.school_id)) ?? ""
          }`,
          q,
        ),
      )
      .slice(0, 8)
      .map((s) => ({
        student_id: s.id,
        school_id: String(s.school_id ?? ""),
        class_id: String(s.class_id ?? ""),
        nome: String(s.full_name),
        detalhe: [String(s.grade ?? ""), nomeEscola.get(String(s.school_id)) ?? ""]
          .filter(Boolean)
          .join(" · "),
      }));
  }, [busca, pacientes, estudantes, nomeEscola, props.context]);

  /** Casos ativos do paciente escolhido, para vincular o compromisso. */
  const casosDoPaciente = useMemo(() => {
    if (!props.valor?.patient_id) return [];
    return casos.filter(
      (c) =>
        c.patient_id === props.valor?.patient_id &&
        ["triagem", "em_andamento"].includes(String(c.status)),
    );
  }, [casos, props.valor?.patient_id]);

  if (props.valor) {
    return (
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2">
          <span className="font-medium">{props.valor.nome}</span>
          {props.valor.detalhe && (
            <span className="text-sm text-base-700">{props.valor.detalhe}</span>
          )}
          <button
            className="btn-secondary ml-auto !py-0.5 text-sm"
            onClick={() => {
              props.onChange(null);
              setBusca("");
            }}
          >
            Trocar
          </button>
        </div>

        {props.context === "clinica" && casosDoPaciente.length > 0 && (
          <div>
            <label className="label" htmlFor="pp-caso">
              Caso
            </label>
            <select
              id="pp-caso"
              className="input"
              value={props.valor.clinical_case_id ?? ""}
              onChange={(e) =>
                props.onChange({ ...props.valor!, clinical_case_id: e.target.value })
              }
            >
              <option value="">— sem caso vinculado —</option>
              {casosDoPaciente.map((c) => (
                <option key={c.id} value={c.id}>
                  {String(c.case_type)} — início {String(c.start_date ?? "")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder={
          props.context === "clinica"
            ? "Buscar paciente pelo nome…"
            : "Buscar estudante por nome, escola, série…"
        }
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
      />
      {aberto && resultados.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-base-300 bg-base-50 shadow-lg">
          {resultados.map((r, i) => (
            <li key={i}>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-base-200"
                onClick={() => {
                  props.onChange(r);
                  setAberto(false);
                }}
              >
                <div className="font-medium">{r.nome}</div>
                {r.detalhe && <div className="text-sm text-base-700">{r.detalhe}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberto && busca.trim().length >= 1 && resultados.length === 0 && (
        <p className="mt-1 text-sm text-base-700">
          Nenhum cadastro encontrado. Cadastre a pessoa no módulo correspondente antes de agendar.
        </p>
      )}
    </div>
  );
}
