/**
 * Agenda — camada de integração entre o prontuário e a psicologia escolar.
 * Visualizações: Hoje, Dia, Semana (principal), Mês e Lista.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { agenda, weekSummary, type AgendaEvent } from "@/lib/agenda";
import { EVENT_STATUS, eventTypesFor, STATUS_STYLE } from "@/lib/agendaOptions";
import { addDays, monthGrid, parseISO, todayISO, weekDays } from "@/lib/agendaTime";
import { api } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { labelOf } from "@/lib/options";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { gerarFolhaAgendaPDF } from "@/lib/docAgendaDiaria";
import { writeFile } from "@/components/exportFile";
import { EventEditor } from "@/components/agenda/EventEditor";
import { ImportarAgenda } from "@/components/agenda/ImportarAgenda";
import { WeekGrid } from "@/components/agenda/WeekGrid";
import { EmptyState, PageHeader, useToast } from "@/components/ui";

type Vista = "hoje" | "dia" | "semana" | "mes" | "lista";

export function AgendaPage() {
  const [vista, setVista] = useState<Vista>("semana");
  const [refDate, setRefDate] = useState(todayISO());
  const [eventos, setEventos] = useState<AgendaEvent[]>([]);
  const [editorAberto, setEditorAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<AgendaEvent | null>(null);
  const [seed, setSeed] = useState<{ date: string; start: string } | undefined>();
  const [importarAberto, setImportarAberto] = useState(false);
  const [faixa, setFaixa] = useState({ inicio: 7, fim: 22 });
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const carregar = useCallback(() => {
    agenda.all().then(setEventos).catch(() => setEventos([]));
  }, []);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    api
      .settingsGet()
      .then((c) =>
        setFaixa({
          inicio: Number(c.agenda_hora_inicio) || 7,
          fim: Number(c.agenda_hora_fim) || 22,
        }),
      )
      .catch(() => undefined);
  }, []);

  const hoje = todayISO();

  // Ctrl+N (atalho global) chega como ?novo=1
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setSelecionado(null);
      setSeed({ date: hoje, start: "08:00" });
      setEditorAberto(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /** Rótulo curto do evento na grade — nome + tipo, nunca conteúdo clínico. */
  const rotulo = useCallback((e: AgendaEvent) => {
    const tipo = labelOf(eventTypesFor(String(e.event_context)), e.event_type);
    const nome = String(e.title ?? "").trim();
    return nome && nome !== tipo ? `${nome} — ${tipo}` : tipo;
  }, []);

  const doDia = useMemo(
    () =>
      eventos
        .filter((e) => e.event_date === refDate)
        .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))),
    [eventos, refDate],
  );

  const deHoje = useMemo(
    () =>
      eventos
        .filter((e) => e.event_date === hoje)
        .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))),
    [eventos, hoje],
  );

  const daSemana = useMemo(() => {
    const dias = weekDays(refDate);
    return eventos.filter((e) => dias.includes(String(e.event_date)));
  }, [eventos, refDate]);

  const resumo = useMemo(() => weekSummary(daSemana), [daSemana]);

  function abrirNovo(date: string, start: string) {
    setSelecionado(null);
    setSeed({ date, start });
    setEditorAberto(true);
  }

  function abrirEvento(e: AgendaEvent) {
    setSelecionado(e);
    setSeed(undefined);
    setEditorAberto(true);
  }

  /** "Registrar atendimento": leva os dados do compromisso para o registro. */
  function registrar(e: AgendaEvent) {
    const params = new URLSearchParams({
      agenda: e.id,
      data: String(e.event_date ?? ""),
      inicio: String(e.start_at ?? ""),
      fim: String(e.end_at ?? ""),
    });
    if (e.clinical_entry_id) {
      nav(`/casos/${e.clinical_case_id}`);
      return;
    }
    if (e.school_record_id && e.student_id) {
      nav(`/estudantes/${e.student_id}`);
      return;
    }
    if (e.event_context === "clinica") {
      if (!e.clinical_case_id) {
        toast("error", "Vincule um caso ao compromisso para registrar o atendimento.");
        return;
      }
      if (e.neuro_stage) params.set("etapa", String(e.neuro_stage));
      nav(`/casos/${e.clinical_case_id}?${params}`);
    } else if (e.event_context === "escolar") {
      if (!e.student_id) {
        toast("error", "Vincule um estudante ao compromisso para registrar o atendimento.");
        return;
      }
      params.set("tipo", String(e.event_type ?? ""));
      nav(`/estudantes/${e.student_id}?${params}`);
    } else {
      toast("error", "Compromissos administrativos não geram registro clínico.");
    }
  }

  /**
   * Folha do dia para impressão: mesmo formato do documento oficial, com as
   * colunas P/F e RESPONSÁVEL em branco para preenchimento e assinatura.
   */
  async function imprimirFolha() {
    const dia = vista === "hoje" ? hoje : refDate;
    const doDiaFolha = eventos
      .filter((e) => e.event_date === dia && e.status !== "cancelado")
      .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    if (doDiaFolha.length === 0) {
      toast("error", `Nenhum atendimento em ${formatDateBR(dia)} para imprimir.`);
      return;
    }
    try {
      const [perfilRows, escolasRows, cfg] = await Promise.all([
        api.list("professional_profiles").catch(() => []),
        api.list("schools").catch(() => []),
        api.settingsGet().catch(() => ({}) as Record<string, string>),
      ]);
      const perfil = perfilRows[0] as Record<string, unknown> | undefined;
      const nomeEscola = new Map<string, string>();
      escolasRows.forEach((s) => nomeEscola.set(s.id, String(s.name)));

      const dest = await saveDialog({
        defaultPath: `AGENDA DE ATENDIMENTO - ${dia}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!dest) return;

      const bytes = gerarFolhaAgendaPDF({
        dataISO: dia,
        profissional: perfil?.name ? String(perfil.name) : "",
        instituicao: perfil?.institution ? String(perfil.institution) : undefined,
        cabecalhoLinhas: (cfg.folha_cabecalho ?? "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        subtitulo: cfg.folha_subtitulo || undefined,
        linhas: doDiaFolha.map((e) => ({
          horario: String(e.start_at ?? ""),
          nome: String(e.title ?? ""),
          contato: String(e.administrative_note ?? "").replace(/^Contato:\s*/i, ""),
          escola: nomeEscola.get(String(e.school_id ?? "")) ?? String(e.location ?? ""),
        })),
      });
      await writeFile(dest, new Uint8Array(bytes));
      await api.exportLog("folha_agenda", "agenda_events", undefined);
      toast("ok", "Folha gerada. Fora do app ela não está protegida.");
    } catch (e) {
      toast("error", `Falha ao gerar a folha: ${String(e)}`);
    }
  }

  const tituloPeriodo = useMemo(() => {
    const d = parseISO(refDate);
    if (vista === "semana") {
      const dias = weekDays(refDate);
      return `${formatDateBR(dias[0])} — ${formatDateBR(dias[6])}`;
    }
    if (vista === "mes") {
      return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    return formatDateBR(refDate);
  }, [refDate, vista]);

  function navegar(passo: number) {
    if (vista === "semana") setRefDate(addDays(refDate, 7 * passo));
    else if (vista === "mes") {
      const d = parseISO(refDate);
      setRefDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1 + passo).padStart(2, "0")}-01`.replace(
          /-(\d{2})-01$/,
          (_m, mm) => {
            const n = Number(mm);
            if (n < 1) return `-12-01`;
            if (n > 12) return `-01-01`;
            return `-${String(n).padStart(2, "0")}-01`;
          },
        ),
      );
    } else setRefDate(addDays(refDate, passo));
  }

  return (
    <div>
      <PageHeader title="Agenda">
        <button
          className="btn-secondary"
          title="Gera a folha de atendimento do dia para impressão e assinatura"
          onClick={() => void imprimirFolha()}
        >
          Imprimir folha do dia
        </button>
        <button className="btn-secondary" onClick={() => setImportarAberto(true)}>
          Importar agenda
        </button>
        <button
          className="btn-primary"
          onClick={() => abrirNovo(refDate === hoje ? hoje : refDate, "08:00")}
        >
          + Novo atendimento
        </button>
      </PageHeader>

      <ImportarAgenda
        open={importarAberto}
        onClose={() => setImportarAberto(false)}
        onImported={carregar}
      />

      {/* controles */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["hoje", "dia", "semana", "mes", "lista"] as Vista[]).map((v) => (
            <button
              key={v}
              className={vista === v ? "btn-primary !py-1 text-sm" : "btn-secondary !py-1 text-sm"}
              onClick={() => {
                setVista(v);
                if (v === "hoje") setRefDate(hoje);
              }}
            >
              {v === "mes" ? "Mês" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        {vista !== "hoje" && vista !== "lista" && (
          <div className="ml-2 flex items-center gap-2">
            <button className="btn-secondary !py-1" onClick={() => navegar(-1)}>
              ‹
            </button>
            <span className="min-w-[190px] text-center font-medium">{tituloPeriodo}</span>
            <button className="btn-secondary !py-1" onClick={() => navegar(1)}>
              ›
            </button>
            <button className="btn-secondary !py-1 text-sm" onClick={() => setRefDate(hoje)}>
              Hoje
            </button>
          </div>
        )}
      </div>

      {/* resumo da semana */}
      {(vista === "semana" || vista === "hoje") && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Nesta semana", resumo.total],
            ["Realizados", resumo.realizados],
            ["Restantes", resumo.restantes],
            ["Faltas", resumo.faltas],
          ].map(([l, v]) => (
            <div key={String(l)} className="card !py-3">
              <div className="text-2xl font-semibold">{v as number}</div>
              <div className="text-sm text-base-700">{l as string}</div>
            </div>
          ))}
          <button
            className={`card !py-3 text-left ${resumo.semRegistro.length > 0 ? "border-amber-500" : ""}`}
            onClick={() => setVista("lista")}
          >
            <div className="text-2xl font-semibold">{resumo.semRegistro.length}</div>
            <div className="text-sm text-base-700">Sem registro</div>
          </button>
        </div>
      )}

      {vista === "semana" && (
        <WeekGrid
          refDate={refDate}
          events={daSemana}
          startHour={faixa.inicio}
          endHour={faixa.fim}
          onCreate={abrirNovo}
          onOpen={abrirEvento}
          labelOf={rotulo}
        />
      )}

      {(vista === "dia" || vista === "hoje") && (
        <ListaDeEventos
          titulo={vista === "hoje" ? "Hoje" : formatDateBR(refDate)}
          eventos={vista === "hoje" ? deHoje : doDia}
          rotulo={rotulo}
          onOpen={abrirEvento}
          destacarProximo
        />
      )}

      {vista === "mes" && (
        <div className="card overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7 gap-1">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="pb-1 text-center text-sm font-medium text-base-700">
                {d}
              </div>
            ))}
            {monthGrid(refDate)
              .flat()
              .map((d) => {
                const doDiaM = eventos.filter((e) => e.event_date === d);
                const mesAtual = parseISO(d).getMonth() === parseISO(refDate).getMonth();
                return (
                  <button
                    key={d}
                    className={`min-h-[86px] rounded border p-1 text-left align-top ${
                      d === hoje ? "border-accent bg-accent-soft dark:bg-base-200" : "border-base-200"
                    } ${mesAtual ? "" : "opacity-40"}`}
                    onClick={() => {
                      setRefDate(d);
                      setVista("dia");
                    }}
                  >
                    <div className="text-sm font-medium">{parseISO(d).getDate()}</div>
                    {doDiaM.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={`mt-0.5 truncate rounded px-1 text-xs ${
                          STATUS_STYLE[String(e.status)] ?? ""
                        }`}
                      >
                        {e.start_at} {rotulo(e)}
                      </div>
                    ))}
                    {doDiaM.length > 3 && (
                      <div className="mt-0.5 text-xs text-base-700">+{doDiaM.length - 3}</div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {vista === "lista" && (
        <ListaDeEventos
          titulo="Todos os compromissos"
          eventos={[...eventos].sort((a, b) =>
            `${b.event_date} ${b.start_at}`.localeCompare(`${a.event_date} ${a.start_at}`),
          )}
          rotulo={rotulo}
          onOpen={abrirEvento}
          mostrarData
        />
      )}

      {editorAberto && (
        <EventEditor
          open
          onClose={() => setEditorAberto(false)}
          event={selecionado}
          seed={seed}
          todosEventos={eventos}
          onSaved={carregar}
          onRegistrar={(e) => {
            setEditorAberto(false);
            registrar(e);
          }}
        />
      )}
    </div>
  );
}

function ListaDeEventos(props: {
  titulo: string;
  eventos: AgendaEvent[];
  rotulo: (e: AgendaEvent) => string;
  onOpen: (e: AgendaEvent) => void;
  mostrarData?: boolean;
  destacarProximo?: boolean;
}) {
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(
    agora.getMinutes(),
  ).padStart(2, "0")}`;
  const proximo = props.destacarProximo
    ? props.eventos.find(
        (e) =>
          String(e.start_at ?? "") >= horaAtual &&
          !["cancelado", "realizado", "faltou"].includes(String(e.status)),
      )
    : undefined;

  if (props.eventos.length === 0) {
    return <EmptyState text={`Nenhum compromisso em ${props.titulo.toLowerCase()}.`} />;
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">{props.titulo}</h2>
      <ul className="space-y-2">
        {props.eventos.map((e) => {
          const ehProximo = proximo?.id === e.id;
          const semRegistro =
            e.status === "realizado" && !e.clinical_entry_id && !e.school_record_id;
          return (
            <li key={e.id}>
              <button
                className={`card flex w-full flex-wrap items-center gap-3 !py-2 text-left hover:bg-base-200 ${
                  ehProximo ? "border-accent ring-1 ring-accent" : ""
                }`}
                onClick={() => props.onOpen(e)}
              >
                <span className="font-mono text-sm">
                  {props.mostrarData && `${formatDateBR(e.event_date)} · `}
                  {e.start_at}–{e.end_at}
                </span>
                <span className="font-medium">{props.rotulo(e)}</span>
                <span className={`badge ${STATUS_STYLE[String(e.status)] ?? ""}`}>
                  {labelOf(EVENT_STATUS, e.status)}
                </span>
                {ehProximo && <span className="badge">próximo</span>}
                {semRegistro && <span className="badge ml-auto">registro pendente</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
