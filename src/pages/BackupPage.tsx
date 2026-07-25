import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTimeBR } from "@/lib/format";
import { Modal, PageHeader, useToast } from "@/components/ui";

export function BackupPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoreStep, setRestoreStep] = useState<0 | 1 | 2>(0);
  const [restoreFile, setRestoreFile] = useState("");
  const [autoDir, setAutoDir] = useState("");
  const [autoDays, setAutoDays] = useState(1);
  const [autoKeep, setAutoKeep] = useState(10);
  const toast = useToast();

  const loadInfo = () =>
    api.dashboard().then((d) => setLastBackup((d.last_backup_at as string) ?? null)).catch(() => undefined);
  useEffect(() => {
    void loadInfo();
    api
      .settingsGet()
      .then((cfg) => {
        setAutoDir(cfg.auto_backup_dir ?? "");
        setAutoDays(Number(cfg.auto_backup_days) || 1);
        setAutoKeep(Number(cfg.auto_backup_keep) || 10);
      })
      .catch(() => undefined);
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
      await api.backupRestore(restoreFile);
      toast("ok", "Backup restaurado com sucesso.");
      setRestoreStep(0);
      await loadInfo();
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

      <div className="card mb-4">
        <h2 className="mb-2 font-semibold">Backup automático</h2>
        <p className="mb-3 text-base-700">
          Escolha uma pasta e o app grava um backup sozinho ao abrir, respeitando o intervalo
          definido. Dica: aponte para uma pasta do OneDrive para ter cópia fora do computador.
        </p>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label className="label">Pasta de destino</label>
            <input className="input" value={autoDir} readOnly placeholder="(não configurada)" />
          </div>
          <button
            className="btn-secondary"
            onClick={async () => {
              const dir = await openDialog({ directory: true });
              if (typeof dir === "string") {
                setAutoDir(dir);
                await api.settingsSet("auto_backup_dir", dir);
                toast("ok", "Backup automático configurado.");
              }
            }}
          >
            Escolher pasta…
          </button>
          {autoDir && (
            <button
              className="btn-secondary"
              onClick={async () => {
                setAutoDir("");
                await api.settingsSet("auto_backup_dir", "");
                toast("ok", "Backup automático desativado.");
              }}
            >
              Desativar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="label">A cada (dias)</label>
            <input
              type="number"
              min={1}
              max={30}
              className="input max-w-[7rem]"
              value={autoDays}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value));
                setAutoDays(v);
                void api.settingsSet("auto_backup_days", String(v));
              }}
            />
          </div>
          <div>
            <label className="label">Manter últimas</label>
            <input
              type="number"
              min={1}
              max={60}
              className="input max-w-[7rem]"
              value={autoKeep}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value));
                setAutoKeep(v);
                void api.settingsSet("auto_backup_keep", String(v));
              }}
            />
          </div>
        </div>
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
        <p className="mb-4">
          Confirmação final: os dados atuais serão substituídos pelos do backup. Uma cópia de
          segurança do estado atual será criada automaticamente antes.
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setRestoreStep(0)}>
            Cancelar
          </button>
          <button className="btn-danger" onClick={() => void doRestore()} disabled={busy}>
            Restaurar agora
          </button>
        </div>
      </Modal>
    </div>
  );
}
