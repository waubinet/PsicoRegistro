/**
 * Aba de Alunos: todos os estudantes de todas as escolas em um só lugar, com
 * busca e filtros. Complementa (não substitui) a lista dentro de cada escola.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Entity } from "@/lib/api";
import { agenda, nextEvent, type AgendaEvent } from "@/lib/agenda";
import { todayISO } from "@/lib/agendaTime";
import { ageFrom, formatDateBR } from "@/lib/format";
import { matchesLocal } from "@/lib/localSearch";
import { labelOf, SHIFTS, STUDENT_STATUS } from "@/lib/options";
import { situacaoAluno } from "@/lib/schoolReport";
import { EmptyState, Loading, PageHeader } from "@/components/ui";

const SITUACAO_ATEND: Record<string, string> = {
  atendido: "Atendido",
  agendado: "Agendado",
  pendente: "Pendente",
};

export function StudentsList() {
  const [estudantes, setEstudantes] = useState<Entity[]>([]);
  const [escolas, setEscolas] = useState<Entity[]>([]);
  const [registros, setRegistros] = useState<Entity[]>([]);
  const [pendencias, setPendencias] = useState<Entity[]>([]);
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
  const [escolaId, setEscolaId] = useState("");
  const [serie, setSerie] = useState("");
  const [turno, setTurno] = useState("");
  const [situacao, setSituacao] = useState("");
  const [atendimento, setAtendimento] = useState("");

  const nav = useNavigate();
  const hoje = todayISO();

  useEffect(() => {
    Promise.all([
      api.list("students").catch(() => []),
      api.list("schools").catch(() => []),
      api.list("school_records").catch(() => []),
      api.list("reminders").catch(() => []),
      agenda.all().catch(() => []),
    ])
      .then(([est, esc, reg, pen, ev]) => {
        setEstudantes(est);
        setEscolas(esc);
        setRegistros(reg);
        setPendencias(pen);
        setEventos(ev);
      })
      .finally(() => setCarregando(false));
  }, []);

  const nomeEscola = useMemo(() => {
    const m = new Map<string, string>();
    escolas.forEach((e) => m.set(e.id, String(e.name)));
    return m;
  }, [escolas]);

  const series = useMemo(
    () =>
      [...new Set(estudantes.map((s) => String(s.grade ?? "").trim()).filter(Boolean))].sort(),
    [estudantes],
  );

  const filtrados = useMemo(() => {
    return estudantes
      .filter((s) => {
        if (escolaId && s.school_id !== escolaId) return false;
        if (serie && String(s.grade ?? "") !== serie) return false;
        if (turno && String(s.shift ?? "") !== turno) return false;
        if (situacao && String(s.status ?? "") !== situacao) return false;
        if (atendimento && situacaoAluno(s.id, registros, pendencias) !== atendimento) return false;
        if (busca) {
          const alvo = `${s.full_name ?? ""} ${s.social_name ?? ""} ${s.grade ?? ""} ${
            s.class_name ?? ""
          } ${s.enrollment ?? ""} ${nomeEscola.get(String(s.school_id)) ?? ""} ${s.tags ?? ""}`;
          if (!matchesLocal(alvo, busca)) return false;
        }
        return true;
      })
      .sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), "pt-BR"));
  }, [
    estudantes,
    escolaId,
    serie,
    turno,
    situacao,
    atendimento,
    busca,
    registros,
    pendencias,
    nomeEscola,
  ]);

  /** Próximo compromisso de cada aluno, para a coluna "Próximo". */
  const proximoPorAluno = useMemo(() => {
    const m = new Map<string, AgendaEvent>();
    for (const s of estudantes) {
      const p = nextEvent(
        eventos.filter((e) => e.student_id === s.id),
        hoje,
      );
      if (p) m.set(s.id, p);
    }
    return m;
  }, [estudantes, eventos, hoje]);

  const limpar = () => {
    setBusca("");
    setEscolaId("");
    setSerie("");
    setTurno("");
    setSituacao("");
    setAtendimento("");
  };

  const temFiltro = busca || escolaId || serie || turno || situacao || atendimento;

  if (carregando) return <Loading />;

  return (
    <div>
      <PageHeader title="Alunos">
        <span className="self-center text-base-700">
          {filtrados.length} de {estudantes.length}
        </span>
      </PageHeader>

      <div className="card mb-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="label" htmlFor="al-busca">
              Buscar
            </label>
            <input
              id="al-busca"
              className="input"
              placeholder="Nome, escola, série, turma, matrícula ou marcador…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="al-escola">
              Escola
            </label>
            <select
              id="al-escola"
              className="input"
              value={escolaId}
              onChange={(e) => setEscolaId(e.target.value)}
            >
              <option value="">Todas</option>
              {escolas.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="al-serie">
              Ano / série
            </label>
            <select
              id="al-serie"
              className="input"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
            >
              <option value="">Todas</option>
              {series.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="al-turno">
              Turno
            </label>
            <select
              id="al-turno"
              className="input"
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
            >
              <option value="">Todos</option>
              {SHIFTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="al-sit">
              Situação do acompanhamento
            </label>
            <select
              id="al-sit"
              className="input"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
            >
              <option value="">Todas</option>
              {STUDENT_STATUS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="al-atend">
              Atendimento
            </label>
            <select
              id="al-atend"
              className="input"
              value={atendimento}
              onChange={(e) => setAtendimento(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="atendido">Atendidos</option>
              <option value="agendado">Agendados</option>
              <option value="pendente">Pendentes</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary w-full" disabled={!temFiltro} onClick={limpar}>
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          text={
            estudantes.length === 0
              ? "Nenhum aluno cadastrado. Cadastre pela página da escola ou use “Importar lista”."
              : "Nenhum aluno corresponde aos filtros."
          }
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Escola</th>
                <th>Série / Turma</th>
                <th>Idade</th>
                <th>Atendimento</th>
                <th>Situação</th>
                <th>Próximo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((s) => {
                const sit = situacaoAluno(s.id, registros, pendencias);
                const prox = proximoPorAluno.get(s.id);
                const idade = ageFrom(s.birth_date as string);
                return (
                  <tr
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => nav(`/estudantes/${s.id}`)}
                  >
                    <td className="font-medium">
                      {String(s.full_name)}
                      {s.is_demo ? <span className="badge ml-2">demo</span> : null}
                    </td>
                    <td>{nomeEscola.get(String(s.school_id)) ?? "—"}</td>
                    <td>
                      {String(s.grade ?? "—")}
                      {s.class_name ? ` · ${s.class_name}` : ""}
                    </td>
                    <td>{idade != null ? `${idade}` : "—"}</td>
                    <td>
                      <span className="badge">{SITUACAO_ATEND[sit]}</span>
                    </td>
                    <td>{labelOf(STUDENT_STATUS, s.status)}</td>
                    <td className="text-sm">
                      {prox ? `${formatDateBR(prox.event_date)} ${prox.start_at}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
