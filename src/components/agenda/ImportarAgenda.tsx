/**
 * Assistente de importação da agenda: selecionar → analisar → prévia →
 * relacionar pessoas → resumo → confirmar. Nada é gravado antes da confirmação
 * final, e o arquivo original nunca é alterado.
 */
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { agenda } from "@/lib/agenda";
import { lerAgenda, type AgendaLida } from "@/lib/agendaImport";
import {
  classificar,
  ehDuplicado,
  resumoClassificacao,
  type Correspondencia,
} from "@/lib/agendaMatch";
import { defaultDuration, SCHOOL_EVENT_TYPES } from "@/lib/agendaOptions";
import { addMinutes } from "@/lib/agendaTime";
import { api, type Entity } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { Modal, useToast } from "@/components/ui";

type Etapa = "arquivo" | "revisao" | "resumo";

export function ImportarAgenda(props: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>("arquivo");
  const [arquivo, setArquivo] = useState<{ filename: string; hash: string } | null>(null);
  const [lida, setLida] = useState<AgendaLida | null>(null);
  const [correspondencias, setCorrespondencias] = useState<Correspondencia[]>([]);
  const [dataEvento, setDataEvento] = useState("");
  const [tipoPadrao, setTipoPadrao] = useState("escuta");
  const [duplicados, setDuplicados] = useState<number[]>([]);
  const [jaImportado, setJaImportado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const toast = useToast();

  function reiniciar() {
    setEtapa("arquivo");
    setArquivo(null);
    setLida(null);
    setCorrespondencias([]);
    setDataEvento("");
    setDuplicados([]);
    setJaImportado(false);
  }

  async function escolherArquivo() {
    const caminho = await openDialog({
      multiple: false,
      filters: [{ name: "Agenda", extensions: ["docx", "csv", "txt"] }],
    });
    if (typeof caminho !== "string") return;
    setOcupado(true);
    try {
      // leitura somente-leitura no backend
      const info = await invoke<{ filename: string; hash: string; base64: string }>(
        "read_import_file",
        { srcPath: caminho },
      );
      const conteudo = lerAgenda(info.filename, info.base64);
      if (conteudo.linhas.length === 0) {
        toast("error", "Nenhum atendimento encontrado no arquivo.");
        setOcupado(false);
        return;
      }

      // já importamos este arquivo antes?
      const importacoes = await api.list("agenda_imports").catch(() => []);
      const repetido = importacoes.some((i) => i.source_hash === info.hash);
      setJaImportado(repetido);

      const [estudantes, pacientes, escolas, eventos] = await Promise.all([
        api.list("students").catch(() => []),
        api.list("patients").catch(() => []),
        api.list("schools").catch(() => []),
        agenda.all(),
      ]);
      const nomeEscola = new Map<string, string>();
      (escolas as Entity[]).forEach((e) => nomeEscola.set(e.id, String(e.name)));

      const cs = classificar(conteudo.linhas, estudantes as Entity[], pacientes as Entity[], nomeEscola);
      const data = conteudo.data ?? "";
      setDuplicados(
        cs
          .map((c, i) =>
            data && ehDuplicado(eventos, data, c.linha.horario, c.escolhido, c.linha.nome) ? i : -1,
          )
          .filter((i) => i >= 0),
      );

      setArquivo({ filename: info.filename, hash: info.hash });
      setLida(conteudo);
      setCorrespondencias(cs);
      setDataEvento(data);
      setEtapa("revisao");
    } catch (e) {
      toast("error", String(e));
    } finally {
      setOcupado(false);
    }
  }

  const resumo = useMemo(() => resumoClassificacao(correspondencias), [correspondencias]);
  const aImportar = useMemo(
    () => correspondencias.filter((c, i) => !c.recusado && !duplicados.includes(i)),
    [correspondencias, duplicados],
  );

  async function confirmar() {
    if (!dataEvento) {
      toast("error", "Informe a data dos atendimentos.");
      return;
    }
    setOcupado(true);
    let gravados = 0;
    try {
      const loteId = await api.create("agenda_imports", {
        filename: arquivo?.filename ?? "",
        source_hash: arquivo?.hash ?? "",
        imported_at: new Date().toISOString(),
        total_rows: String(correspondencias.length),
        imported_rows: String(aImportar.length),
        ignored_rows: String(lida?.ignoradas ?? 0),
        error_rows: "0",
      });

      for (let i = 0; i < correspondencias.length; i++) {
        const c = correspondencias[i];
        if (c.recusado || duplicados.includes(i)) continue;
        const cand = c.candidatos.find((x) => x.id === c.escolhido);
        const estudante = cand?.kind === "student" ? cand.id : "";
        const paciente = cand?.kind === "patient" ? cand.id : "";
        // escola vem do cadastro do estudante, não do texto do arquivo
        let escolaId = "";
        if (estudante) {
          const s = await api.get("students", estudante).catch(() => null);
          escolaId = s ? String(s.school_id ?? "") : "";
        }
        await agenda.create({
          event_context: paciente ? "clinica" : "escolar",
          event_type: paciente ? "psicoterapia" : tipoPadrao,
          status: "agendado",
          event_date: dataEvento,
          start_at: c.linha.horario,
          end_at: addMinutes(c.linha.horario, defaultDuration(tipoPadrao)),
          title: c.linha.nome,
          location: c.linha.escola ?? "",
          administrative_note: c.linha.contato ? `Contato: ${c.linha.contato}` : "",
          student_id: estudante,
          patient_id: paciente,
          school_id: escolaId,
          import_batch_id: loteId,
          origin: "importacao",
        });
        gravados += 1;
      }
      toast("ok", `${gravados} compromisso(s) importado(s).`);
      props.onImported();
      reiniciar();
      props.onClose();
    } catch (e) {
      toast("error", `Importados ${gravados}. Erro: ${String(e)}`);
      props.onImported();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal
      open={props.open}
      onClose={() => {
        reiniciar();
        props.onClose();
      }}
      title="Importar agenda"
      wide
    >
      {etapa === "arquivo" && (
        <div>
          <p className="mb-3 text-base-700">
            Selecione a agenda de atendimento (<code>.docx</code> do CEAP ou <code>.csv</code>). O
            arquivo é lido em modo somente leitura — o original não é alterado.
          </p>
          <button className="btn-primary" disabled={ocupado} onClick={() => void escolherArquivo()}>
            {ocupado ? "Analisando…" : "Selecionar arquivo…"}
          </button>
        </div>
      )}

      {etapa === "revisao" && lida && (
        <div>
          <div className="mb-3 rounded-md border border-base-200 bg-base-100 p-3">
            <div className="font-medium">{arquivo?.filename}</div>
            <div className="text-sm text-base-700">
              {resumo.total} atendimento(s) encontrado(s) · {resumo.seguras} vinculado(s)
              automaticamente · {resumo.possiveis} para confirmar · {resumo.naoEncontrados} sem
              cadastro · {duplicados.length} duplicado(s) · {lida.ignoradas} linha(s) vazia(s)
              ignorada(s)
            </div>
            {jaImportado && (
              <p className="mt-2 text-amber-700">
                ⚠ Este arquivo já foi importado antes. Os duplicados abaixo não serão gravados de
                novo.
              </p>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="imp-data">
                Data dos atendimentos {!lida.data && "(não encontrada no arquivo)"}
              </label>
              <input
                id="imp-data"
                type="date"
                className="input"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="imp-tipo">
                Tipo de atendimento
              </label>
              <select
                id="imp-tipo"
                className="input"
                value={tipoPadrao}
                onChange={(e) => setTipoPadrao(e.target.value)}
              >
                {SCHOOL_EVENT_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[42vh] overflow-y-auto rounded-md border border-base-200">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Nome no arquivo</th>
                  <th>Vincular a</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {correspondencias.map((c, i) => {
                  const dup = duplicados.includes(i);
                  return (
                    <tr key={i} className={c.recusado || dup ? "opacity-50" : ""}>
                      <td className="font-mono">{c.linha.horario}</td>
                      <td>
                        {c.linha.nome}
                        {c.linha.escola && (
                          <div className="text-xs text-base-700">{c.linha.escola}</div>
                        )}
                      </td>
                      <td>
                        {c.candidatos.length > 0 ? (
                          <select
                            className="input !py-1"
                            value={c.escolhido}
                            disabled={c.recusado || dup}
                            onChange={(e) => {
                              const novo = [...correspondencias];
                              novo[i] = { ...c, escolhido: e.target.value };
                              setCorrespondencias(novo);
                            }}
                          >
                            <option value="">— não vincular —</option>
                            {c.candidatos.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.nome} {k.detalhe ? `(${k.detalhe})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-base-700">
                            sem cadastro — será criado sem vínculo
                          </span>
                        )}
                      </td>
                      <td>
                        {dup ? (
                          <span className="badge">duplicado</span>
                        ) : c.classificacao === "segura" ? (
                          <span className="badge">exato</span>
                        ) : c.classificacao === "possivel" ? (
                          <span className="badge">confirmar</span>
                        ) : (
                          <span className="badge">novo</span>
                        )}
                        {!dup && (
                          <button
                            className="btn-secondary ml-1 !px-2 !py-0.5 text-xs"
                            onClick={() => {
                              const novo = [...correspondencias];
                              novo[i] = { ...c, recusado: !c.recusado, escolhido: "" };
                              setCorrespondencias(novo);
                            }}
                          >
                            {c.recusado ? "incluir" : "pular"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button className="btn-secondary" onClick={reiniciar}>
              Voltar
            </button>
            <button className="btn-primary" onClick={() => setEtapa("resumo")}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {etapa === "resumo" && (
        <div>
          <h3 className="mb-2 font-semibold">Confirmar importação</h3>
          <ul className="mb-4 list-disc pl-5 text-base-800">
            <li>
              <strong>{aImportar.length}</strong> compromisso(s) serão criados em{" "}
              {formatDateBR(dataEvento)}
            </li>
            <li>{aImportar.filter((c) => c.escolhido).length} vinculado(s) a cadastros existentes</li>
            <li>{duplicados.length} duplicado(s) serão ignorados</li>
            <li>Nenhum estudante ou paciente novo será criado automaticamente</li>
          </ul>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setEtapa("revisao")}>
              Voltar
            </button>
            <button className="btn-primary" disabled={ocupado} onClick={() => void confirmar()}>
              {ocupado ? "Importando…" : `Importar ${aImportar.length}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
