/**
 * Ficha "Registro Avaliativo Individual para Encaminhamento".
 *
 * Preenchida a partir do documento oficial da rede. A identificação do aluno
 * vem do cadastro — você só marca o que observou. Fica salva no estudante e
 * pode ser impressa para o professor regente assinar.
 */
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Entity } from "@/lib/api";
import {
  CAMPOS_DESCRITIVOS,
  chaveItem,
  contarMarcados,
  FREQUENCIA_INDISCIPLINA,
  MOTIVOS_ENCAMINHAMENTO,
  SECOES,
} from "@/lib/fichaEncaminhamento";
import { gerarFichaPDF } from "@/lib/docFicha";
import { writeFile } from "@/components/exportFile";
import { Modal, useToast } from "@/components/ui";

export function FichaEncaminhamento(props: {
  open: boolean;
  onClose: () => void;
  estudante: Entity;
  escola: Entity | null;
  onSalvo?: () => void;
}) {
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [fichaId, setFichaId] = useState("");
  const [secaoAberta, setSecaoAberta] = useState<string>("identificacao");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  const carregar = useCallback(() => {
    api
      .list("school_records", [
        ["student_id", props.estudante.id],
        ["activity_type", "ficha_encaminhamento"],
      ])
      .then((rows) => {
        const f = rows[0];
        if (f) {
          setFichaId(f.id);
          try {
            setValores(JSON.parse(String(f.ficha ?? "{}")));
          } catch {
            setValores({});
          }
        }
      })
      .catch(() => undefined);
  }, [props.estudante.id]);

  useEffect(() => {
    if (props.open) carregar();
  }, [props.open, carregar]);

  const marcados = useMemo(() => contarMarcados(valores), [valores]);

  const set = (k: string, v: unknown) => setValores((s) => ({ ...s, [k]: v }));
  const marcar = (k: string) => setValores((s) => ({ ...s, [k]: !s[k] }));

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        student_id: props.estudante.id,
        school_id: String(props.estudante.school_id ?? ""),
        activity_type: "ficha_encaminhamento",
        status: "rascunho",
        record_date: String(valores.data_preenchimento ?? new Date().toISOString().slice(0, 10)),
        objective: "Registro Avaliativo Individual para Encaminhamento",
        ficha: JSON.stringify(valores),
      };
      if (fichaId) await api.update("school_records", fichaId, payload);
      else setFichaId(await api.create("school_records", payload));
      toast("ok", `Ficha salva (${marcados} item(ns) marcado(s)).`);
      props.onSalvo?.();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function imprimir() {
    try {
      const perfil = (await api.list("professional_profiles").catch(() => []))[0] as
        | Record<string, unknown>
        | undefined;
      const dest = await saveDialog({
        defaultPath: `FICHA DE ENCAMINHAMENTO - ${String(props.estudante.full_name)}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!dest) return;
      const bytes = gerarFichaPDF({
        estudante: props.estudante,
        escola: props.escola,
        valores,
        cidade: String(perfil?.city ?? "Conceição do Araguaia"),
      });
      await writeFile(dest, new Uint8Array(bytes));
      await api.exportLog("ficha_encaminhamento", "students", props.estudante.id);
      toast("ok", "Ficha gerada. Fora do app ela não está protegida.");
    } catch (e) {
      toast("error", `Falha ao gerar: ${String(e)}`);
    }
  }

  const abas = [
    { id: "identificacao", titulo: "Identificação" },
    { id: "motivo", titulo: "Motivo" },
    ...SECOES.map((s) => ({ id: s.id, titulo: s.titulo })),
    { id: "descritivos", titulo: "Descrição" },
  ];

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Ficha de encaminhamento — ${String(props.estudante.full_name)}`}
      wide
    >
      {/* navegação por seção */}
      <div className="mb-3 flex flex-wrap gap-1">
        {abas.map((a) => (
          <button
            key={a.id}
            className={
              secaoAberta === a.id ? "btn-primary !py-1 text-sm" : "btn-secondary !py-1 text-sm"
            }
            onClick={() => setSecaoAberta(a.id)}
          >
            {a.titulo}
          </button>
        ))}
      </div>

      <div className="max-h-[52vh] overflow-y-auto rounded-md border border-base-200 p-3">
        {secaoAberta === "identificacao" && (
          <div className="grid gap-3 md:grid-cols-2">
            <p className="md:col-span-2 text-sm text-base-700">
              Nome, nascimento, série e turma vêm do cadastro do estudante. Complete apenas o que
              faltar.
            </p>
            {[
              ["naturalidade", "Naturalidade"],
              ["endereco", "Endereço"],
              ["telefone", "Telefone"],
              ["pai", "Pai"],
              ["mae", "Mãe"],
              ["com_quem_mora", "Com quem mora"],
              ["ano_letivo", "Ano letivo"],
              ["fase", "Fase"],
              ["ciclo", "Ciclo"],
              ["professor_regente", "Professor(a) sala regular"],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="label" htmlFor={`f-${k}`}>
                  {label}
                </label>
                <input
                  id={`f-${k}`}
                  className="input"
                  value={String(valores[k] ?? "")}
                  onChange={(e) => set(k, e.target.value)}
                />
              </div>
            ))}
            <div>
              <label className="label" htmlFor="f-data">
                Data do preenchimento
              </label>
              <input
                id="f-data"
                type="date"
                className="input"
                value={String(valores.data_preenchimento ?? "")}
                onChange={(e) => set("data_preenchimento", e.target.value)}
              />
            </div>
          </div>
        )}

        {secaoAberta === "motivo" && (
          <div>
            <h4 className="mb-2 font-medium">Motivo do encaminhamento</h4>
            <div className="grid gap-1 md:grid-cols-2">
              {MOTIVOS_ENCAMINHAMENTO.map((m, i) => (
                <label key={m} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(valores[`chk:motivo.m.${i}`])}
                    onChange={() => marcar(`chk:motivo.m.${i}`)}
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
            <label className="label mt-3" htmlFor="f-motivo-outro">
              Outro(s)
            </label>
            <input
              id="f-motivo-outro"
              className="input"
              value={String(valores.motivo_outro ?? "")}
              onChange={(e) => set("motivo_outro", e.target.value)}
            />
          </div>
        )}

        {SECOES.filter((s) => s.id === secaoAberta).map((secao) => (
          <div key={secao.id} className="space-y-4">
            {secao.grupos.map((g) => (
              <div key={g.id}>
                <h4 className="font-medium">{g.titulo}</h4>
                {g.enunciado && <p className="text-sm text-base-700">{g.enunciado}</p>}
                <div className="mt-1 grid gap-1 md:grid-cols-2">
                  {g.itens.map((item, i) => {
                    const k = chaveItem(secao.id, g.id, i);
                    return (
                      <label key={k} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(valores[k])}
                          onChange={() => marcar(k)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    );
                  })}
                </div>
                {g.outros && (
                  <input
                    className="input mt-2"
                    placeholder="Outros…"
                    value={String(valores[`txt:${secao.id}.${g.id}.outros`] ?? "")}
                    onChange={(e) => set(`txt:${secao.id}.${g.id}.outros`, e.target.value)}
                  />
                )}
              </div>
            ))}

            {secao.id === "comportamento" && (
              <div>
                <h4 className="font-medium">Frequência da indisciplina</h4>
                <div className="flex gap-3">
                  {FREQUENCIA_INDISCIPLINA.map((f) => (
                    <label key={f} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="freq-indisciplina"
                        checked={valores.freq_indisciplina === f}
                        onChange={() => set("freq_indisciplina", f)}
                      />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {secaoAberta === "descritivos" && (
          <div className="space-y-3">
            {CAMPOS_DESCRITIVOS.map((c) => (
              <div key={c.id}>
                <label className="label" htmlFor={`f-${c.id}`}>
                  {c.label}
                </label>
                {c.ajuda && <p className="mb-1 text-xs text-base-700">{c.ajuda}</p>}
                <textarea
                  id={`f-${c.id}`}
                  rows={2}
                  className="input"
                  value={String(valores[`txt:${c.id}`] ?? "")}
                  onChange={(e) => set(`txt:${c.id}`, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-sm text-base-700">{marcados} item(ns) marcado(s)</span>
        <button className="btn-secondary" onClick={() => void imprimir()}>
          Imprimir ficha
        </button>
        <button className="btn-secondary" onClick={props.onClose}>
          Fechar
        </button>
        <button className="btn-primary" disabled={salvando} onClick={() => void salvar()}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
