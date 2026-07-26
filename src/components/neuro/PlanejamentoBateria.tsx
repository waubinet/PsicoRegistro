/**
 * Planejamento da bateria neuropsicológica (integra o antigo bateria-neuro).
 *
 * A idade vem do cadastro do paciente — nada de redigitar. Você escolhe as
 * demandas, o app sugere os instrumentos, e a bateria selecionada fica salva no
 * caso, alimentando a etapa de aplicação e o Arquivo Restrito.
 *
 * Trabalha apenas com METADADOS dos testes. Nunca itens, estímulos ou conteúdo
 * protegido — isso continua fora do sistema, por princípio.
 */
import { useEffect, useMemo, useState } from "react";
import { api, type Entity } from "@/lib/api";
import { ageFrom } from "@/lib/format";
import {
  agruparPorRespondente,
  DEMANDAS,
  filtrarInstrumentos,
  NIVEIS_ESCOLARES,
  RESPONDENTE_LABEL,
  urlManual,
  type Instrumento,
} from "@/lib/instrumentos";
import { EmptyState, useToast } from "@/components/ui";

export function PlanejamentoBateria(props: {
  caseId: string;
  paciente: Entity | null;
  /** Chamado quando a bateria é salva, para a etapa de aplicação recarregar. */
  onSalvo?: () => void;
}) {
  const [demandas, setDemandas] = useState<string[]>([]);
  const [nivel, setNivel] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [idadeManual, setIdadeManual] = useState<string>("");
  const [pastaManuais, setPastaManuais] = useState("");
  const [planoId, setPlanoId] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  const idadeCadastro = ageFrom(props.paciente?.birth_date as string);
  const idade = idadeManual !== "" ? Number(idadeManual) : idadeCadastro;

  // carrega bateria já planejada e a pasta de manuais
  useEffect(() => {
    api
      .list("neuropsych_instruments", [["case_id", props.caseId]])
      .then((rows) => {
        const plano = rows[0];
        if (plano) {
          setPlanoId(plano.id);
          setSelecionados(String(plano.instrumentos ?? "").split(",").filter(Boolean));
          setDemandas(String(plano.demandas ?? "").split(",").filter(Boolean));
          setNivel(String(plano.nivel ?? ""));
        }
      })
      .catch(() => undefined);
    api
      .settingsGet()
      .then((c) => setPastaManuais(c.pasta_manuais ?? ""))
      .catch(() => undefined);
  }, [props.caseId]);

  const sugeridos = useMemo(
    () => filtrarInstrumentos({ idade, demandas, nivel }),
    [idade, demandas, nivel],
  );
  const agrupados = useMemo(() => agruparPorRespondente(sugeridos), [sugeridos]);

  const escolhidos = useMemo(
    () => sugeridos.filter((i) => selecionados.includes(i.id)),
    [sugeridos, selecionados],
  );

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        case_id: props.caseId,
        instrumentos: selecionados.join(","),
        demandas: demandas.join(","),
        nivel,
        idade_referencia: idade != null ? String(idade) : "",
      };
      if (planoId) await api.update("neuropsych_instruments", planoId, payload);
      else setPlanoId(await api.create("neuropsych_instruments", payload));
      toast("ok", `Bateria salva: ${selecionados.length} instrumento(s).`);
      props.onSalvo?.();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setSalvando(false);
    }
  }

  const cartao = (i: Instrumento) => {
    const marcado = selecionados.includes(i.id);
    const manual = urlManual(pastaManuais, i.arquivo);
    return (
      <li
        key={i.id}
        className={`rounded-md border p-2 ${
          marcado ? "border-accent bg-accent-soft dark:bg-base-200" : "border-base-200"
        }`}
      >
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={marcado}
            onChange={() => alternar(i.id)}
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <strong>{i.nome}</strong>
              {i.ouro && <span className="badge" title="Referência na área">★ padrão-ouro</span>}
              {i.status === "SATEPSI" && <span className="badge">SATEPSI</span>}
              {i.brIndisponivel && <span className="badge">sem versão BR</span>}
              {i.risco && <span className="badge">risco</span>}
            </span>
            <span className="block text-sm text-base-700">{i.descricao}</span>
            <span className="block text-xs text-base-700">
              {i.idadeMin}–{i.idadeMax} anos · {i.tipo}
            </span>
            {i.obs && <span className="mt-0.5 block text-xs text-base-700">{i.obs}</span>}
            <span className="mt-1 flex flex-wrap gap-2 text-xs">
              {manual && (
                <a className="underline" href={manual} target="_blank" rel="noreferrer">
                  📄 manual
                </a>
              )}
              {i.fonte && (
                <a className="underline" href={i.fonte} target="_blank" rel="noreferrer">
                  {i.gratuito ? "⬇ download" : "🛒 onde obter"}
                </a>
              )}
            </span>
          </span>
        </label>
      </li>
    );
  };

  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Planejamento da bateria</h3>
        <button className="btn-primary !py-1 text-sm" disabled={salvando} onClick={() => void salvar()}>
          {salvando ? "Salvando…" : `Salvar bateria (${selecionados.length})`}
        </button>
      </div>

      <p className="mb-3 text-sm text-base-700">
        Sugestão de instrumentos por idade e demanda. A escolha final é sempre sua — o sistema não
        interpreta resultados nem indica diagnóstico.
      </p>

      {/* filtros */}
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="pb-idade">
            Idade
            {idadeCadastro != null && idadeManual === "" && (
              <span className="ml-1 font-normal text-base-700">(do cadastro)</span>
            )}
          </label>
          <input
            id="pb-idade"
            type="number"
            min={0}
            max={110}
            className="input"
            placeholder={idadeCadastro != null ? String(idadeCadastro) : "informe"}
            value={idadeManual}
            onChange={(e) => setIdadeManual(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="pb-nivel">
            Nível escolar
          </label>
          <select
            id="pb-nivel"
            className="input"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
          >
            <option value="">Não filtrar</option>
            {NIVEIS_ESCOLARES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-sm text-base-700">
            {sugeridos.length} instrumento(s) compatível(is)
          </span>
        </div>
      </div>

      <div className="mb-3">
        <span className="label">Demanda(s)</span>
        <div className="flex flex-wrap gap-1.5">
          {DEMANDAS.map((d) => {
            const ativo = demandas.includes(d.id);
            return (
              <button
                key={d.id}
                className={ativo ? "btn-primary !py-1 text-sm" : "btn-secondary !py-1 text-sm"}
                onClick={() =>
                  setDemandas((s) =>
                    s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id],
                  )
                }
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* bateria escolhida */}
      {escolhidos.length > 0 && (
        <div className="mb-4 rounded-md border border-accent bg-accent-soft p-3 dark:bg-base-200">
          <h4 className="mb-1 font-medium">Bateria selecionada</h4>
          <p className="text-sm">{escolhidos.map((i) => i.nome).join(" · ")}</p>
        </div>
      )}

      {/* sugestões agrupadas por respondente */}
      {idade == null && demandas.length === 0 ? (
        <EmptyState text="Informe a idade e/ou a demanda para ver as sugestões." />
      ) : sugeridos.length === 0 ? (
        <EmptyState text="Nenhum instrumento compatível com esses filtros." />
      ) : (
        <div className="space-y-4">
          {Object.entries(agrupados).map(([resp, lista]) => (
            <div key={resp}>
              <h4 className="mb-1 text-sm font-medium text-base-700">
                {RESPONDENTE_LABEL[resp] ?? resp} ({lista.length})
              </h4>
              <ul className="grid gap-2 md:grid-cols-2">{lista.map(cartao)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
