import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTimeBR } from "@/lib/format";
import { Modal, PageHeader, useToast } from "@/components/ui";
import { useSession } from "@/store/session";

export function BackupPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoreStep, setRestoreStep] = useState<0 | 1 | 2>(0);
  const [restoreFile, setRestoreFile] = useState("");
  const [restorePw, setRestorePw] = useState("");
  const toast = useToast();
  const { lock } = useSession();

  const loadInfo = () =>
    api.dashboard().then((d) => setLastBackup((d.last_backup_at as string) ?? null)).catch(() => undefined);
  useEffect(() => {
    void loadInfo();
  }, []);

  async function doBackup() {
    const dest = await saveDialog({
      defaultPath: `psicoregistro-backup-${new Date().toISOString().slice(0, 10)}.prbk`,
      filters: [{ name: "Backup PsicoRegistro", extensions: ["prbk"] }],
    });
    if (!dest) return;
    setBusy(true);
    try {
      await api.backupCreate(dest);
      toast("ok", "Backup criado e verificado com sucesso.");
      await loadInfo();
    } catch (e) {
      toast("error", `Falha no backup: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function pickRestoreFile() {
    const file = await openDialog({
      multiple: false,
      filters: [{ name: "Backup PsicoRegistro", extensions: ["prbk"] }],
    });
    if (typeof file === "string") {
      setRestoreFile(file);
      setRestoreStep(1);
    }
  }

  async function doRestore() {
    setBusy(true);
    try {
      await api.backupRestore(restoreFile, restorePw);
      toast("ok", "Backup restaurado. A aplicação será bloqueada para recarregar os dados.");
      setRestoreStep(0);
      setRestorePw("");
      await lock();
    } catch (e) {
      toast("error", `Falha na restauração: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Backup e restauração" />

      <div className="card mb-4">
        <h2 className="mb-2 font-semibold">Criar backup</h2>
        <p className="mb-3 text-base-700">
          Gera um arquivo <code>.prbk</code> criptografado com a sua senha-mestra, contendo o banco
          e os anexos. A integridade é verificada automaticamente antes de concluir.
        </p>
        <p className="mb-3 text-sm text-base-700">
          Último backup: {lastBackup ? formatDateTimeBR(lastBackup) : "nunca"}
        </p>
        <button className="btn-primary" onClick={() => void doBackup()} disabled={busy}>
          Criar backup agora
        </button>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Restaurar backup</h2>
        <p className="mb-3 text-base-700">
          A restauração substitui os dados atuais. Uma cópia de segurança do estado atual é criada
          automaticamente antes de qualquer substituição.
        </p>
        <button className="btn-secondary" onClick={() => void pickRestoreFile()} disabled={busy}>
          Selecionar arquivo de backup…
        </button>
      </div>

      {/* Confirmação em duas etapas */}
      <Modal open={restoreStep === 1} onClose={() => setRestoreStep(0)} title="Restaurar — etapa 1 de 2">
        <p className="mb-4">
          Arquivo selecionado:
          <br />
          <code className="break-all">{restoreFile}</code>
        </p>
        <p className="mb-4 text-amber-700">
          ⚠ Isto substituirá os dados atuais. Uma cópia de segurança será criada automaticamente.
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setRestoreStep(0)}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => setRestoreStep(2)}>
            Continuar
          </button>
        </div>
      </Modal>

      <Modal open={restoreStep === 2} onClose={() => setRestoreStep(0)} title="Restaurar — etapa 2 de 2">
        <p className="mb-4">Digite a senha-mestra usada no backup para confirmar a restauração.</p>
        <input
          type="password"
          className="input mb-4"
          value={restorePw}
          onChange={(e) => setRestorePw(e.target.value)}
          placeholder="Senha do backup"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setRestoreStep(0)}>
            Cancelar
          </button>
          <button className="btn-danger" onClick={() => void doRestore()} disabled={busy || !restorePw}>
            Restaurar agora
          </button>
        </div>
      </Modal>
    </div>
  );
}
