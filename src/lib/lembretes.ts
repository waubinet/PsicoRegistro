/**
 * Lembretes locais dos compromissos da agenda, via notificação do Windows.
 *
 * Privacidade: por padrão a notificação **não mostra o nome** da pessoa —
 * apenas "Você tem um atendimento às 14:00". Mostrar o nome é opção explícita
 * do usuário. Nada sai da máquina.
 */
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { AgendaEvent } from "./agenda";
import { toMinutes } from "./agendaTime";

export const ANTECEDENCIAS = [
  { value: "0", label: "Desligado" },
  { value: "5", label: "5 minutos antes" },
  { value: "10", label: "10 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
];

export async function garantirPermissao(): Promise<boolean> {
  try {
    let ok = await isPermissionGranted();
    if (!ok) ok = (await requestPermission()) === "granted";
    return ok;
  } catch {
    return false;
  }
}

/** Texto da notificação — discreto por padrão. */
export function textoLembrete(
  e: AgendaEvent,
  mostrarNome: boolean,
): { title: string; body: string } {
  const hora = String(e.start_at ?? "");
  if (!mostrarNome) {
    return {
      title: "PsicoRegistro",
      body: `Você tem um atendimento às ${hora}.`,
    };
  }
  const nome = String(e.title ?? "").trim();
  return {
    title: `Atendimento às ${hora}`,
    body: nome || "Compromisso agendado",
  };
}

/** Minutos entre agora e o início do evento (negativo = já passou). */
export function minutosAte(e: AgendaEvent, agora: Date): number | null {
  const inicio = toMinutes(String(e.start_at ?? ""));
  if (inicio < 0) return null;
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  return inicio - agoraMin;
}

/**
 * Eventos que devem ser notificados agora: começam dentro da antecedência,
 * ainda não passaram e não estão cancelados/realizados.
 */
export function aNotificar(
  eventos: AgendaEvent[],
  hojeISO: string,
  agora: Date,
  antecedencia: number,
  jaAvisados: Set<string>,
): AgendaEvent[] {
  if (antecedencia <= 0) return [];
  return eventos.filter((e) => {
    if (String(e.event_date ?? "") !== hojeISO) return false;
    if (["cancelado", "realizado", "faltou", "remarcado"].includes(String(e.status))) return false;
    if (jaAvisados.has(e.id)) return false;
    const faltam = minutosAte(e, agora);
    return faltam !== null && faltam >= 0 && faltam <= antecedencia;
  });
}

/** Dispara as notificações pendentes e devolve os ids avisados. */
export async function dispararLembretes(
  eventos: AgendaEvent[],
  hojeISO: string,
  antecedencia: number,
  mostrarNome: boolean,
  jaAvisados: Set<string>,
): Promise<string[]> {
  const alvos = aNotificar(eventos, hojeISO, new Date(), antecedencia, jaAvisados);
  if (alvos.length === 0) return [];
  if (!(await garantirPermissao())) return [];
  const avisados: string[] = [];
  for (const e of alvos) {
    try {
      sendNotification(textoLembrete(e, mostrarNome));
      avisados.push(e.id);
    } catch {
      /* notificação indisponível: segue sem interromper o app */
    }
  }
  return avisados;
}
