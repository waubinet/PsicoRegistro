import * as Dialog from "@radix-ui/react-dialog";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/* ---------- Modal ---------- */

export function Modal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] ${
            props.wide ? "max-w-4xl" : "max-w-xl"
          } -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-base-300 bg-base-50 p-6 shadow-xl`}
        >
          <Dialog.Title className="mb-4 text-xl font-semibold">{props.title}</Dialog.Title>
          {props.children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title}>
      <div className="mb-6 text-base-800">{props.message}</div>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={props.onClose}>
          Cancelar
        </button>
        <button
          className={props.danger ? "btn-danger" : "btn-primary"}
          onClick={() => {
            props.onConfirm();
            props.onClose();
          }}
        >
          {props.confirmLabel ?? "Confirmar"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Toasts ---------- */

type Toast = { id: number; kind: "ok" | "error"; text: string };
const ToastCtx = createContext<(kind: "ok" | "error", text: string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider(props: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: "ok" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {props.children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm rounded-md px-4 py-3 text-white shadow-lg ${
              t.kind === "ok" ? "bg-accent" : "bg-red-700"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Diversos ---------- */

export function EmptyState(props: { text: string }) {
  return <div className="card py-10 text-center text-base-700">{props.text}</div>;
}

export function Loading() {
  return <div className="py-10 text-center text-base-700">Carregando…</div>;
}

export function StatusBadge(props: { label: string }) {
  return <span className="badge">{props.label}</span>;
}

export function PageHeader(props: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{props.title}</h1>
      <div className="flex gap-2">{props.children}</div>
    </div>
  );
}

/** Diálogo que pede a senha-mestra para confirmar operações sensíveis. */
export function PasswordConfirm(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message: string;
}) {
  const [pw, setPw] = useState("");
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title}>
      <p className="mb-4 text-base-800">{props.message}</p>
      <label className="label" htmlFor="pw-confirm">
        Senha-mestra
      </label>
      <input
        id="pw-confirm"
        type="password"
        className="input mb-6"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        autoFocus
      />
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={props.onClose}>
          Cancelar
        </button>
        <button
          className="btn-danger"
          disabled={!pw}
          onClick={() => {
            props.onConfirm(pw);
            setPw("");
            props.onClose();
          }}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}
