import { useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useToast } from "./ui";

type Phase = "idle" | "checking" | "available" | "downloading" | "ready" | "uptodate";

/**
 * Verifica atualizações via GitHub Releases. A única conexão de rede do app é
 * do lado Rust (updater) para o endpoint de releases — o conteúdo do webview
 * continua isolado pela CSP, e nenhum dado de paciente é enviado.
 */
export function UpdateChecker() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  async function run() {
    setPhase("checking");
    try {
      const update = await check();
      if (!update) {
        setPhase("uptodate");
        return;
      }
      setVersion(update.version);
      setNotes(update.body ?? "");
      setPhase("available");

      // baixa e instala mostrando progresso
      setPhase("downloading");
      let total = 0;
      let received = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          setProgress(total ? Math.round((received / total) * 100) : 0);
        }
      });
      setPhase("ready");
      toast("ok", "Atualização instalada. Reinicie para aplicar.");
    } catch (e) {
      setPhase("idle");
      toast("error", `Não foi possível atualizar: ${String(e)}`);
    }
  }

  return (
    <div>
      <p className="mb-2 text-base-700">
        Verifica se há uma versão nova no GitHub. Só o verificador acessa a internet; nenhum dado de
        paciente é enviado.
      </p>
      {phase === "uptodate" && <p className="mb-2 text-accent">Você já está na versão mais recente.</p>}
      {phase === "available" && <p className="mb-2">Versão {version} disponível.</p>}
      {phase === "downloading" && (
        <p className="mb-2">Baixando atualização… {progress}%</p>
      )}
      {phase === "ready" && (
        <div className="mb-2">
          <p className="text-accent">Versão {version} instalada.</p>
          {notes && <p className="text-sm text-base-700">{notes}</p>}
        </div>
      )}
      <div className="flex gap-3">
        <button
          className="btn-secondary"
          disabled={phase === "checking" || phase === "downloading"}
          onClick={() => void run()}
        >
          {phase === "checking"
            ? "Verificando…"
            : phase === "downloading"
              ? "Baixando…"
              : "Verificar atualizações"}
        </button>
        {phase === "ready" && (
          <button className="btn-primary" onClick={() => void relaunch()}>
            Reiniciar agora
          </button>
        )}
      </div>
    </div>
  );
}
