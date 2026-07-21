/**
 * Exportação em PDF: mostra os campos que serão incluídos, permite desmarcar,
 * exige confirmação, registra na auditoria e permite senha no PDF.
 * O PDF exportado fica FORA da proteção da aplicação — o aviso é exibido sempre.
 */
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { jsPDF } from "jspdf";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateBR } from "@/lib/format";
import { Modal, useToast } from "./ui";

export type ExportSection = { title: string; fields: { label: string; value: string }[] };

export function ExportDialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  exportType: string;
  targetKind: string;
  targetId?: string;
  sections: ExportSection[];
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pdfPassword, setPdfPassword] = useState("");
  const toast = useToast();
  const [header, setHeader] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!props.open) return;
    const init: Record<string, boolean> = {};
    props.sections.forEach((s, si) =>
      s.fields.forEach((_, fi) => {
        init[`${si}.${fi}`] = true;
      }),
    );
    setChecked(init);
    api
      .list("professional_profiles")
      .then((rows) => {
        if (rows[0]) setHeader(rows[0] as unknown as Record<string, string>);
      })
      .catch(() => undefined);
  }, [props.open, props.sections]);

  async function doExport() {
    const dest = await saveDialog({
      defaultPath: `${props.exportType}-${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!dest) return;
    try {
      const doc = new jsPDF({
        unit: "mm",
        format: "a4",
        ...(pdfPassword
          ? { encryption: { userPassword: pdfPassword, ownerPassword: pdfPassword } }
          : {}),
      });
      let y = 18;
      const pageH = doc.internal.pageSize.getHeight();
      const write = (text: string, opts?: { bold?: boolean; size?: number }) => {
        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.setFontSize(opts?.size ?? 10.5);
        const lines = doc.splitTextToSize(text, 175);
        for (const line of lines) {
          if (y > pageH - 18) {
            doc.addPage();
            y = 18;
          }
          doc.text(line, 17, y);
          y += 5.4;
        }
      };
      if (header.name) write(String(header.name), { bold: true, size: 13 });
      const sub = [header.crp && `CRP ${header.crp}`, header.contact, header.institution]
        .filter(Boolean)
        .join(" · ");
      if (sub) write(sub, { size: 9.5 });
      y += 2;
      write(props.title, { bold: true, size: 12 });
      write(`Gerado em ${formatDateBR(new Date().toISOString())}`, { size: 9 });
      y += 3;
      props.sections.forEach((s, si) => {
        const fields = s.fields.filter((_, fi) => checked[`${si}.${fi}`]);
        if (fields.length === 0) return;
        y += 2;
        write(s.title, { bold: true, size: 11 });
        for (const f of fields) {
          write(`${f.label}: ${f.value || "—"}`);
        }
      });
      y += 4;
      write(
        "Documento gerado pelo PsicoRegistro como recurso técnico de exportação. A adequação a finalidades éticas, jurídicas ou institucionais específicas deve ser avaliada pelo(a) profissional.",
        { size: 8.5 },
      );
      const bytes = doc.output("arraybuffer");
      const { writeFile } = await import("./exportFile");
      await writeFile(dest, new Uint8Array(bytes));
      await api.exportLog(props.exportType, props.targetKind, props.targetId);
      toast(
        "ok",
        "PDF exportado. Atenção: o arquivo exportado fica fora da proteção da aplicação.",
      );
      props.onClose();
    } catch (e) {
      toast("error", `Falha na exportação: ${String(e)}`);
    }
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={`Exportar: ${props.title}`} wide>
      <p className="mb-3 text-base-800">
        Revise o que será incluído. Desmarque o que não deve constar no documento.
      </p>
      <div className="mb-4 max-h-[45vh] space-y-4 overflow-y-auto rounded-md border border-base-200 p-3">
        {props.sections.map((s, si) => (
          <div key={si}>
            <h4 className="mb-1 font-semibold">{s.title}</h4>
            {s.fields.map((f, fi) => (
              <label key={fi} className="flex items-start gap-2 py-0.5">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked[`${si}.${fi}`] ?? true}
                  onChange={(e) =>
                    setChecked((c) => ({ ...c, [`${si}.${fi}`]: e.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium">{f.label}:</span>{" "}
                  <span className="text-base-700">{f.value ? f.value.slice(0, 120) : "—"}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <label className="label" htmlFor="pdf-pass">
        Senha do PDF (opcional)
      </label>
      <input
        id="pdf-pass"
        type="password"
        className="input mb-2"
        value={pdfPassword}
        onChange={(e) => setPdfPassword(e.target.value)}
      />
      <p className="mb-4 text-sm text-base-700">
        ⚠ O arquivo exportado ficará fora da proteção interna da aplicação. Guarde-o com cuidado.
      </p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={props.onClose}>
          Cancelar
        </button>
        <button className="btn-primary" onClick={() => void doExport()}>
          Confirmar exportação
        </button>
      </div>
    </Modal>
  );
}
