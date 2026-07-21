import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Entity } from "@/lib/api";
import { formatDateTimeBR } from "@/lib/format";
import { Modal, useToast } from "./ui";

export function Attachments(props: { ownerKind: string; ownerId: string; restricted?: boolean }) {
  const [items, setItems] = useState<Entity[]>([]);
  const [preview, setPreview] = useState<{ name: string; mime: string; base64: string } | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    api
      .list("attachments", [
        ["owner_kind", props.ownerKind],
        ["owner_id", props.ownerId],
      ])
      .then(setItems)
      .catch(() => setItems([]));
  }, [props.ownerKind, props.ownerId]);

  useEffect(load, [load]);

  async function add() {
    const file = await openDialog({
      multiple: false,
      filters: [{ name: "Documentos e imagens", extensions: ["pdf", "jpg", "jpeg", "png", "docx", "odt"] }],
    });
    if (typeof file !== "string") return;
    try {
      await api.attachmentAdd(props.ownerKind, props.ownerId, file, props.restricted);
      toast("ok", "Anexo adicionado e criptografado.");
      load();
    } catch (e) {
      toast("error", String(e));
    }
  }

  async function exportOne(a: Entity) {
    const dest = await saveDialog({ defaultPath: String(a.original_name ?? "anexo") });
    if (!dest) return;
    try {
      await api.attachmentExport(a.id, dest);
      toast("ok", "Arquivo exportado. Atenção: fora da aplicação ele não está mais protegido.");
    } catch (e) {
      toast("error", String(e));
    }
  }

  async function previewOne(a: Entity) {
    try {
      setPreview(await api.attachmentPreview(a.id));
    } catch (e) {
      toast("error", String(e));
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Anexos</h3>
        <button className="btn-secondary !py-1 text-sm" onClick={() => void add()}>
          + Adicionar anexo
        </button>
      </div>
      {items.length === 0 && <p className="text-base-700">Nenhum anexo.</p>}
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{String(a.original_name ?? "anexo")}</span>
            <span className="text-sm text-base-700">{formatDateTimeBR(a.created_at)}</span>
            <button className="btn-secondary !py-1 text-sm" onClick={() => void previewOne(a)}>
              Ver
            </button>
            <button className="btn-secondary !py-1 text-sm" onClick={() => void exportOne(a)}>
              Exportar
            </button>
          </li>
        ))}
      </ul>
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.name ?? ""} wide>
        {preview?.mime.startsWith("image/") && (
          <img
            src={`data:${preview.mime};base64,${preview.base64}`}
            alt={preview.name}
            className="max-h-[70vh] w-auto max-w-full"
          />
        )}
        {preview?.mime === "application/pdf" && (
          <iframe
            src={`data:application/pdf;base64,${preview.base64}`}
            title={preview.name}
            className="h-[70vh] w-full"
          />
        )}
      </Modal>
    </div>
  );
}
