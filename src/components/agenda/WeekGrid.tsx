/**
 * Grade semanal da agenda. Cada dia é uma coluna; os horários ficam na lateral.
 * Clique em espaço vazio cria; clique no evento abre.
 *
 * Sem biblioteca de calendário: a grade é CSS puro sobre a lógica já testada em
 * `agendaTime`. Menos peso, menos risco e integra com o tema atual.
 */
import { useMemo } from "react";
import type { AgendaEvent } from "@/lib/agenda";
import { eventDuration } from "@/lib/agenda";
import { STATUS_STYLE } from "@/lib/agendaOptions";
import { parseISO, toMinutes, weekDays, todayISO } from "@/lib/agendaTime";

const ALTURA_HORA = 56; // px

export function WeekGrid(props: {
  refDate: string;
  events: AgendaEvent[];
  startHour: number;
  endHour: number;
  onCreate: (date: string, start: string) => void;
  onOpen: (e: AgendaEvent) => void;
  labelOf: (e: AgendaEvent) => string;
}) {
  const dias = useMemo(() => weekDays(props.refDate), [props.refDate]);
  const hoje = todayISO();
  const horas = useMemo(
    () => Array.from({ length: props.endHour - props.startHour }, (_, i) => props.startHour + i),
    [props.startHour, props.endHour],
  );
  const alturaTotal = horas.length * ALTURA_HORA;
  const inicioGrade = props.startHour * 60;

  const porDia = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    for (const d of dias) m.set(d, []);
    for (const e of props.events) {
      const d = String(e.event_date ?? "");
      if (m.has(d)) m.get(d)!.push(e);
    }
    return m;
  }, [dias, props.events]);

  return (
    <div className="card overflow-x-auto p-0">
      <div className="min-w-[860px]">
        {/* cabeçalho dos dias */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-base-300">
          <div />
          {dias.map((d) => {
            const data = parseISO(d);
            const ehHoje = d === hoje;
            return (
              <div
                key={d}
                className={`px-2 py-2 text-center ${ehHoje ? "bg-accent-soft dark:bg-base-200" : ""}`}
              >
                <div className="text-sm text-base-700">
                  {data.toLocaleDateString("pt-BR", { weekday: "short" })}
                </div>
                <div className={`text-lg ${ehHoje ? "font-bold text-accent-dark" : "font-medium"}`}>
                  {data.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* corpo */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)]">
          {/* coluna de horários */}
          <div style={{ height: alturaTotal }} className="relative border-r border-base-200">
            {horas.map((h, i) => (
              <div
                key={h}
                className="absolute right-1 text-xs text-base-700"
                style={{ top: i * ALTURA_HORA - 6 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {dias.map((d) => (
            <div
              key={d}
              className={`relative border-r border-base-200 ${d === hoje ? "bg-accent-soft/30 dark:bg-base-100" : ""}`}
              style={{ height: alturaTotal }}
            >
              {/* faixas clicáveis de 30 min */}
              {horas.flatMap((h) =>
                [0, 30].map((min) => (
                  <button
                    key={`${h}-${min}`}
                    className="absolute left-0 right-0 border-t border-base-200 hover:bg-accent-soft dark:hover:bg-base-200"
                    style={{
                      top: (h - props.startHour) * ALTURA_HORA + (min / 60) * ALTURA_HORA,
                      height: ALTURA_HORA / 2,
                    }}
                    title={`Novo às ${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`}
                    onClick={() =>
                      props.onCreate(
                        d,
                        `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
                      )
                    }
                  />
                )),
              )}

              {/* eventos */}
              {(porDia.get(d) ?? []).map((e) => {
                const ini = toMinutes(String(e.start_at ?? ""));
                if (ini < 0) return null;
                const dur = Math.max(20, eventDuration(e));
                const top = ((ini - inicioGrade) / 60) * ALTURA_HORA;
                if (top < -ALTURA_HORA) return null;
                const altura = (dur / 60) * ALTURA_HORA;
                const estilo = STATUS_STYLE[String(e.status)] ?? STATUS_STYLE.agendado;
                return (
                  <button
                    key={e.id}
                    className={`absolute left-1 right-1 overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-left text-xs shadow-sm ${estilo}`}
                    style={{ top: Math.max(0, top), height: altura }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      props.onOpen(e);
                    }}
                    title={props.labelOf(e)}
                  >
                    <div className="font-medium leading-tight">{e.start_at}</div>
                    <div className="truncate leading-tight">{props.labelOf(e)}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
