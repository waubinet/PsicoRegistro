/**
 * Virada de ano letivo: promove, retém, transfere ou conclui estudantes em
 * lote, preservando o histórico de matrícula (ano → série/turma) e todos os
 * atendimentos já registrados. Nada é automático: o profissional revisa e
 * confirma cada aluno.
 */
import { useEffect, useMemo, useState } from "react";
import { api, type Entity } from "@/lib/api";
import { Modal, useToast } from "./ui";

type Destino = "aprovado" | "reprovado" | "transferido" | "concluinte" | "ignorar";

const DESTINOS: { value: Destino; label: string; ajuda: string }[] = [
  { value: "aprovado", label: "Aprovado", ajuda: "avança para a série seguinte" },
  { value: "reprovado", label: "Reprovado", ajuda: "permanece na mesma série" },
  { value: "transferido", label: "Transferido", ajuda: "sai da escola" },
  { value: "concluinte", label: "Concluinte", ajuda: "encerra o acompanhamento" },
  { value: "ignorar", label: "Não mexer", ajuda: "mantém como está" },
];

/** "3º ano" → "4º ano"; "Nível I" → "Nível II". Devolve null se não souber. */
export function proximaSerie(serie: string): string | null {
  const s = serie.trim();
  const arabe = /^(\d+)\s*(º|o|°)?\s*(.*)$/i.exec(s);
  if (arabe) {
    const n = Number(arabe[1]);
    if (n > 0 && n < 20) return `${n + 1}º ${arabe[3]}`.trim();
  }
  const romanos = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const rom = /^(.*?)\s+(I{1,3}|IV|V|VI{0,3}|IX)$/i.exec(s);
  if (rom) {
    const i = romanos.indexOf(rom[2].toUpperCase());
    if (i >= 0 && i + 1 < romanos.length) return `${rom[1]} ${romanos[i + 1]}`.trim();
  }
  return null;
}

export function ViradaAnoLetivo(props: {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  students: Entity[];
  onDone: () => void;
}) {
  const anoAtual = new Date().getFullYear();
  const [anoDe, setAnoDe] = useState(anoAtual);
  const [anoPara, setAnoPara] = useState(anoAtual + 1);
  const [escolhas, setEscolhas] = useState<Record<string, Destino>>({});
  const [series, setSeries] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const ativos = useMemo(
    () => props.students.filter((s) => !["transferido", "encerrado"].includes(String(s.status))),
    [props.students],
  );

  useEffect(() => {
    if (!props.open) return;
    const e: Record<string, Destino> = {};
    const sr: Record<string, string> = {};
    for (const s of ativos) {
      e[s.id] = "aprovado";
      sr[s.id] = proximaSerie(String(s.grade ?? "")) ?? String(s.grade ?? "");
    }
    setEscolhas(e);
    setSeries(sr);
  }, [props.open, ativos]);

  function aplicarTodos(d: Destino) {
    const e: Record<string, Destino> = {};
    for (const s of ativos) e[s.id] = d;
    setEscolhas(e);
  }

  async function confirmar() {
    setBusy(true);
    let n = 0;
    try {
      for (const s of ativos) {
        const destino = escolhas[s.id] ?? "ignorar";
        if (destino === "ignorar") continue;

        // histórico: guarda a matrícula do ano que está terminando
        const historico = String(s.enrollment_history ?? "");
        const linha = `${anoDe}: ${String(s.grade ?? "—")}${s.class_name ? ` (${s.class_name})` : ""}`;
        const novoHistorico = historico ? `${historico}\n${linha}` : linha;

        const patch: Record<string, unknown> = {
          ...s,
          school_id: props.schoolId,
          enrollment_history: novoHistorico,
          school_year: String(anoPara),
        };

        if (destino === "aprovado") {
          patch.grade = series[s.id] ?? s.grade;
          patch.class_name = "";
        } else if (destino === "reprovado") {
          patch.class_name = "";
        } else if (destino === "transferido") {
          patch.status = "transferido";
        } else if (destino === "concluinte") {
          patch.status = "encerrado";
        }

        await api.update("students", s.id, patch);
        n += 1;
      }
      toast("ok", `Virada concluída: ${n} estudante(s) atualizado(s).`);
      props.onDone();
      props.onClose();
    } catch (e) {
      toast("error", `Processados ${n}. Erro: ${String(e)}`);
      props.onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Virada de ano letivo" wide>
      <p className="mb-3 text-base-700">
        Define a situação de cada estudante para o próximo ano. O histórico de matrícula é
        preservado e <strong>todos os atendimentos já registrados continuam vinculados</strong>.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Ano que encerra</label>
          <input
            type="number"
            className="input max-w-[8rem]"
            value={anoDe}
            onChange={(e) => setAnoDe(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Novo ano letivo</label>
          <input
            type="number"
            className="input max-w-[8rem]"
            value={anoPara}
            onChange={(e) => setAnoPara(Number(e.target.value))}
          />
        </div>
        <div className="flex gap-2">
          {DESTINOS.filter((d) => d.value !== "ignorar").map((d) => (
            <button
              key={d.value}
              className="btn-secondary !py-1 text-sm"
              onClick={() => aplicarTodos(d.value)}
            >
              Todos: {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 max-h-[45vh] overflow-y-auto rounded-md border border-base-200">
        <table className="table-base">
          <thead>
            <tr>
              <th>Estudante</th>
              <th>Série atual</th>
              <th>Situação</th>
              <th>Nova série</th>
            </tr>
          </thead>
          <tbody>
            {ativos.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{String(s.full_name)}</td>
                <td>{String(s.grade ?? "—")}</td>
                <td>
                  <select
                    className="input !py-1"
                    value={escolhas[s.id] ?? "aprovado"}
                    onChange={(e) =>
                      setEscolhas({ ...escolhas, [s.id]: e.target.value as Destino })
                    }
                  >
                    {DESTINOS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label} — {d.ajuda}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="input !py-1"
                    value={series[s.id] ?? ""}
                    disabled={escolhas[s.id] !== "aprovado"}
                    onChange={(e) => setSeries({ ...series, [s.id]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ativos.length === 0 && <p className="mb-4 text-base-700">Nenhum estudante ativo.</p>}

      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={props.onClose} disabled={busy}>
          Cancelar
        </button>
        <button
          className="btn-primary"
          onClick={() => void confirmar()}
          disabled={busy || ativos.length === 0}
        >
          {busy ? "Aplicando…" : `Confirmar virada (${ativos.length})`}
        </button>
      </div>
    </Modal>
  );
}
