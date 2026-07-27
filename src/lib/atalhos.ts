/**
 * Atalhos globais de teclado. Ficam fora do React para poderem ser testados
 * sem montar componentes.
 *
 * Regra: um atalho nunca dispara enquanto o foco está num campo de texto —
 * digitar "n" numa evolução não pode abrir um novo atendimento.
 */

export type Atalho = {
  /** Tecla em minúsculo, como vem de `KeyboardEvent.key`. */
  tecla: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  descricao: string;
  /** Rota de destino (ou ação especial tratada pelo chamador). */
  acao: string;
};

export const ATALHOS: Atalho[] = [
  { tecla: "n", ctrl: true, descricao: "Novo atendimento na agenda", acao: "novo-atendimento" },
  { tecla: "k", ctrl: true, descricao: "Pesquisar", acao: "/pesquisa" },
  { tecla: "a", ctrl: true, shift: true, descricao: "Abrir a agenda", acao: "/agenda" },
  { tecla: "h", ctrl: true, shift: true, descricao: "Ir para hoje (painel)", acao: "/" },
  { tecla: "?", shift: true, descricao: "Mostrar os atalhos", acao: "ajuda-atalhos" },
];

/** O foco está num campo onde a digitação deve prevalecer? */
export function focoEmCampo(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable === true;
}

/** Qual atalho corresponde a este evento? `null` se nenhum. */
export function resolver(e: {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey?: boolean;
}): Atalho | null {
  const tecla = e.key.toLowerCase();
  const ctrl = e.ctrlKey || Boolean(e.metaKey);
  for (const a of ATALHOS) {
    if (a.tecla !== tecla) continue;
    if (Boolean(a.ctrl) !== ctrl) continue;
    if (Boolean(a.shift) !== e.shiftKey) continue;
    if (Boolean(a.alt) !== e.altKey) continue;
    return a;
  }
  return null;
}

/** Rótulo legível do atalho, para a tela de ajuda. */
export function rotulo(a: Atalho): string {
  const partes: string[] = [];
  if (a.ctrl) partes.push("Ctrl");
  if (a.shift) partes.push("Shift");
  if (a.alt) partes.push("Alt");
  partes.push(a.tecla === "?" ? "?" : a.tecla.toUpperCase());
  return partes.join(" + ");
}
