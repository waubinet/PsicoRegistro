import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { parseStudentLines } from "./parseStudents";
import { Modal, useToast } from "./ui";

export function ImportStudents(props: {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  onImported: () => void;
}) {
  const [grade, setGrade] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const parsed = useMemo(() => parseStudentLines(text), [text]);

  async function doImport() {
    if (parsed.length === 0) return;
    setBusy(true);
    let ok = 0;
    try {
      for (const p of parsed) {
        await api.create("students", {
          school_id: props.schoolId,
          full_name: p.full_name,
          gender: p.gender ?? "",
          birth_date: p.birth_date ?? "",
          grade: grade || "",
          status: "aguardando",
          demand_origin: "Lista nominal importada",
        });
        ok += 1;
      }
      toast("ok", `${ok} estudante(s) importado(s).`);
      props.onImported();
      props.onClose();
      setText("");
      setGrade("");
    } catch (e) {
      toast("error", `Importados ${ok}. Erro no restante: ${String(e)}`);
      props.onImported();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Importar lista nominal de alunos" wide>
      <p className="mb-3 text-base-700">
        Cole a lista de nomes — <strong>um aluno por linha</strong>. Você pode colar direto de uma
        coluna do Excel. Se colar colunas (nome, sexo, nascimento), o sistema separa automaticamente.
      </p>

      <label className="label" htmlFor="imp-grade">
        Ano / série / nível (aplicado a todos desta importação)
      </label>
      <input
        id="imp-grade"
        className="input mb-3"
        placeholder="ex.: Nível I, 3º ano…"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
      />

      <label className="label" htmlFor="imp-text">
        Lista de alunos
      </label>
      <textarea
        id="imp-text"
        className="input mb-2 font-mono text-sm"
        rows={10}
        placeholder={"ANA LIVIA DA SILVA\nJOÃO LUCAS FERREIRA\n... ou colando do Excel:\nANA LIVIA\tF\t12/06/2022"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <p className="mb-4 text-sm text-base-700">
        {parsed.length} aluno(s) reconhecido(s).
        {parsed.length > 0 && (
          <> Prévia: {parsed.slice(0, 3).map((p) => p.full_name).join(", ")}
            {parsed.length > 3 ? "…" : ""}</>
        )}
      </p>

      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={props.onClose} disabled={busy}>
          Cancelar
        </button>
        <button className="btn-primary" onClick={() => void doImport()} disabled={busy || parsed.length === 0}>
          {busy ? "Importando…" : `Importar ${parsed.length} aluno(s)`}
        </button>
      </div>
    </Modal>
  );
}
