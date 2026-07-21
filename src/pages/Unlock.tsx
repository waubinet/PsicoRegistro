import { useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

/** Tela de desbloqueio / criação da senha-mestra. Não exibe nomes nem dados. */
export function Unlock() {
  const { initialized, refresh } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (initialized) {
        await api.unlock(password);
      } else {
        if (password !== confirm) {
          setError("As senhas não coincidem.");
          setBusy(false);
          return;
        }
        await api.setupPassword(password);
      }
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100 p-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <h1 className="mb-1 text-2xl font-semibold text-accent">PsicoRegistro</h1>
        <p className="mb-6 text-base-700">
          {initialized ? "Aplicação bloqueada" : "Primeiro uso — crie sua senha-mestra"}
        </p>

        <label className="label" htmlFor="pw">
          Senha-mestra
        </label>
        <input
          id="pw"
          type={show ? "text" : "password"}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="off"
        />

        {!initialized && (
          <>
            <label className="label mt-4" htmlFor="pw2">
              Confirme a senha
            </label>
            <input
              id="pw2"
              type={show ? "text" : "password"}
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </>
        )}

        <label className="mt-3 flex items-center gap-2 text-base-800">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Mostrar senha
        </label>

        {error && <p className="field-error mt-3">{error}</p>}

        {!initialized && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            ⚠ A senha-mestra protege todos os dados por criptografia. <strong>Se ela for
            perdida, os dados não poderão ser recuperados.</strong> Guarde-a em local seguro.
            Mínimo de 8 caracteres.
          </div>
        )}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={busy || !password}>
          {initialized ? "Desbloquear" : "Criar senha e entrar"}
        </button>
      </form>
    </div>
  );
}
