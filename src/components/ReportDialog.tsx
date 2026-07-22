import { useState } from "react";
import { ExportDialog, type ExportSection } from "./ExportDialog";
import { Modal } from "./ui";
import { currentYear, presetsForYear } from "@/lib/period";

/**
 * Seleção de período (bimestral/semestral/anual/personalizado) e geração do
 * relatório em PDF. `build(from, to)` monta as seções conforme o período.
 */
export function ReportDialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  exportType: string;
  targetKind: string;
  targetId?: string;
  build: (from: string, to: string) => ExportSection[];
}) {
  const [year, setYear] = useState(currentYear());
  const [from, setFrom] = useState(`${currentYear()}-01-01`);
  const [to, setTo] = useState(`${currentYear()}-12-31`);
  const [showExport, setShowExport] = useState(false);
  const presets = presetsForYear(year);

  function applyPreset(value: string) {
    const p = presets.find((x) => x.value === value);
    if (p) {
      setFrom(p.from);
      setTo(p.to);
    }
  }

  return (
    <>
      <Modal open={props.open && !showExport} onClose={props.onClose} title={props.title}>
        <label className="label" htmlFor="rep-year">
          Ano
        </label>
        <input
          id="rep-year"
          type="number"
          className="input mb-3 max-w-[8rem]"
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value) || currentYear();
            setYear(y);
            setFrom(`${y}-01-01`);
            setTo(`${y}-12-31`);
          }}
        />

        <label className="label">Período</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.value} className="btn-secondary !py-1 text-sm" onClick={() => applyPreset(p.value)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="rep-from">
              De
            </label>
            <input id="rep-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="rep-to">
              Até
            </label>
            <input id="rep-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={props.onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => setShowExport(true)}>
            Gerar relatório
          </button>
        </div>
      </Modal>

      {showExport && (
        <ExportDialog
          open
          onClose={() => {
            setShowExport(false);
            props.onClose();
          }}
          title={`${props.title} (${from} a ${to})`}
          exportType={props.exportType}
          targetKind={props.targetKind}
          targetId={props.targetId}
          sections={props.build(from, to)}
        />
      )}
    </>
  );
}
