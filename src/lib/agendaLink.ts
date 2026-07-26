/**
 * Vínculo entre um compromisso da agenda e o registro que ele originou.
 * Ao criar a evolução/registro escolar a partir do evento, o evento passa a
 * apontar para o registro e é marcado como realizado.
 */
import { agenda } from "./agenda";

export async function vincularAgenda(
  eventId: string,
  vinculo: { clinical_entry_id?: string; school_record_id?: string },
): Promise<void> {
  if (!eventId) return;
  try {
    const atual = await agenda.get(eventId);
    await agenda.update(eventId, {
      ...atual,
      ...vinculo,
      // atendimento registrado ⇒ compromisso realizado
      status: ["cancelado", "faltou"].includes(String(atual.status))
        ? atual.status
        : "realizado",
    });
  } catch {
    // o registro clínico é o que importa: falha no vínculo não pode derrubá-lo
  }
}
