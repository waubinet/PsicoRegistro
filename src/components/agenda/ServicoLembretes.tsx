/**
 * Verifica periodicamente se algum compromisso está próximo e dispara a
 * notificação do Windows. Roda em segundo plano enquanto o app está aberto.
 *
 * Sem componente visual — montado uma vez no layout.
 */
import { useEffect, useRef } from "react";
import { agenda } from "@/lib/agenda";
import { todayISO } from "@/lib/agendaTime";
import { api } from "@/lib/api";
import { dispararLembretes } from "@/lib/lembretes";

const INTERVALO_MS = 60_000; // confere a cada minuto

export function ServicoLembretes() {
  const avisados = useRef<Set<string>>(new Set());

  useEffect(() => {
    let ativo = true;

    async function conferir() {
      if (!ativo) return;
      try {
        const cfg = await api.settingsGet();
        const antecedencia = Number(cfg.agenda_lembrete_minutos) || 0;
        if (antecedencia <= 0) return;
        const mostrarNome = cfg.agenda_mostrar_nome_notificacao === "1";
        const hoje = todayISO();
        const eventos = await agenda.range(hoje, hoje);
        const novos = await dispararLembretes(
          eventos,
          hoje,
          antecedencia,
          mostrarNome,
          avisados.current,
        );
        novos.forEach((id) => avisados.current.add(id));
      } catch {
        /* silencioso: lembrete nunca pode atrapalhar o uso */
      }
    }

    void conferir();
    const t = setInterval(() => void conferir(), INTERVALO_MS);
    // à meia-noite, limpa a lista de avisados do dia
    const limpeza = setInterval(() => avisados.current.clear(), 6 * 60 * 60 * 1000);
    return () => {
      ativo = false;
      clearInterval(t);
      clearInterval(limpeza);
    };
  }, []);

  return null;
}
