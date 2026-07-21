import { useState } from "react";
import { formatDateBR } from "@/lib/format";

export type TimelineItem = {
  id: string;
  date: string;
  type: string;
  status?: string;
  author?: string;
  hasAttachment?: boolean;
  hasReferral?: boolean;
  hasAddendum?: boolean;
  onOpen?: () => void;
};

export function Timeline(props: { items: TimelineItem[] }) {
  const [asc, setAsc] = useState(false);
  const items = [...props.items].sort((a, b) =>
    asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  );
  if (items.length === 0) {
    return <p className="py-4 text-base-700">Nenhum registro na linha do tempo.</p>;
  }
  return (
    <div>
      <button className="btn-secondary mb-3 !py-1 text-sm" onClick={() => setAsc(!asc)}>
        Ordenar: {asc ? "mais antigo primeiro" : "mais recente primeiro"}
      </button>
      <ol className="relative border-l border-base-300 pl-5">
        {items.map((it) => (
          <li key={it.id} className="mb-4">
            <span className="absolute -left-1.5 mt-2 h-3 w-3 rounded-full bg-accent" aria-hidden />
            <button
              className="w-full rounded-md border border-base-200 bg-base-100 p-3 text-left hover:bg-base-200"
              onClick={it.onOpen}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{formatDateBR(it.date)}</span>
                <span className="badge">{it.type}</span>
                {it.status && <span className="badge">{it.status}</span>}
                {it.hasAttachment && <span title="Possui anexo">📎</span>}
                {it.hasReferral && <span title="Possui encaminhamento">↗</span>}
                {it.hasAddendum && <span title="Possui adendo">✎</span>}
              </div>
              {it.author && <div className="mt-1 text-sm text-base-700">Autor: {it.author}</div>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
