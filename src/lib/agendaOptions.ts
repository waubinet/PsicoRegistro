/** Vocabulário da agenda (valores internos → rótulos pt-BR). */
import type { Option } from "./options";

/** Contexto do evento — define quais vínculos e ações aparecem. */
export const EVENT_CONTEXTS: Option[] = [
  { value: "clinica", label: "Clínica" },
  { value: "escolar", label: "Psicologia Escolar" },
  { value: "outro", label: "Outros" },
];

export const CLINICAL_EVENT_TYPES: Option[] = [
  { value: "psicoterapia", label: "Psicoterapia" },
  { value: "avaliacao_neuropsicologica", label: "Avaliação neuropsicológica" },
  { value: "intervencao", label: "Intervenção" },
  { value: "entrevista", label: "Entrevista" },
  { value: "anamnese", label: "Anamnese" },
  { value: "devolutiva", label: "Devolutiva" },
  { value: "orientacao", label: "Orientação" },
  { value: "outro", label: "Outro" },
];

export const SCHOOL_EVENT_TYPES: Option[] = [
  { value: "escuta", label: "Escuta" },
  { value: "acolhimento", label: "Acolhimento" },
  { value: "observacao", label: "Observação" },
  { value: "intervencao_individual", label: "Intervenção individual" },
  { value: "intervencao_grupal", label: "Intervenção grupal" },
  { value: "conversa_responsaveis", label: "Conversa com responsável" },
  { value: "reuniao_professor", label: "Conversa com professor" },
  { value: "reuniao_coordenacao", label: "Reunião com coordenação" },
  { value: "reuniao_multiprofissional", label: "Reunião multiprofissional" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "acompanhamento", label: "Acompanhamento" },
  { value: "atividade_institucional", label: "Atividade institucional" },
  { value: "outro", label: "Outro" },
];

export const OTHER_EVENT_TYPES: Option[] = [
  { value: "reuniao", label: "Reunião" },
  { value: "administrativo", label: "Compromisso administrativo" },
  { value: "bloqueado", label: "Horário bloqueado" },
  { value: "pessoal", label: "Evento pessoal" },
  { value: "outro", label: "Outro" },
];

export function eventTypesFor(context: string): Option[] {
  if (context === "clinica") return CLINICAL_EVENT_TYPES;
  if (context === "escolar") return SCHOOL_EVENT_TYPES;
  return OTHER_EVENT_TYPES;
}

export const EVENT_STATUS: Option[] = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "faltou", label: "Faltou" },
  { value: "remarcado", label: "Remarcado" },
  { value: "aguardando", label: "Aguardando" },
  { value: "bloqueado", label: "Bloqueado" },
];

/** Cor da faixa do evento na grade semanal (usa o tema atual). */
export const STATUS_STYLE: Record<string, string> = {
  agendado: "bg-accent-soft border-accent text-accent-dark",
  confirmado: "bg-accent text-white border-accent-dark",
  realizado: "bg-emerald-100 border-emerald-500 text-emerald-900",
  cancelado: "bg-base-200 border-base-300 text-base-700 line-through",
  faltou: "bg-amber-100 border-amber-500 text-amber-900",
  remarcado: "bg-sky-100 border-sky-500 text-sky-900",
  aguardando: "bg-base-100 border-base-300 text-base-800",
  bloqueado: "bg-base-300 border-base-300 text-base-800",
};

/** Etapas da avaliação neuropsicológica que um evento pode representar. */
export const NEURO_STAGES_EVENT: Option[] = [
  { value: "entrevista_inicial", label: "Entrevista inicial" },
  { value: "anamnese", label: "Anamnese" },
  { value: "aplicacao", label: "Aplicação" },
  { value: "correcao", label: "Correção" },
  { value: "integracao", label: "Integração" },
  { value: "devolutiva", label: "Devolutiva" },
  { value: "outra", label: "Outra etapa" },
];

export const RECURRENCE_FREQUENCIES: Option[] = [
  { value: "semanal", label: "Toda semana" },
  { value: "quinzenal", label: "A cada 2 semanas" },
  { value: "mensal", label: "Todo mês" },
  { value: "personalizado", label: "Intervalo personalizado" },
];

export const ABSENCE_KINDS: Option[] = [
  { value: "ferias", label: "Férias" },
  { value: "feriado", label: "Feriado" },
  { value: "folga", label: "Folga" },
  { value: "indisponivel", label: "Indisponível" },
  { value: "curso", label: "Curso/congresso" },
];

/** Durações padrão (minutos) por tipo — apenas administrativas, editáveis. */
export const DEFAULT_DURATIONS: Record<string, number> = {
  psicoterapia: 50,
  avaliacao_neuropsicologica: 60,
  intervencao: 50,
  entrevista: 60,
  anamnese: 60,
  devolutiva: 50,
  orientacao: 30,
  escuta: 50,
  acolhimento: 30,
  observacao: 50,
  intervencao_individual: 50,
  intervencao_grupal: 60,
  conversa_responsaveis: 30,
  reuniao_professor: 30,
  reuniao_coordenacao: 60,
  reuniao_multiprofissional: 60,
  reuniao: 60,
  administrativo: 30,
};

export function defaultDuration(eventType: string, fallback = 50): number {
  return DEFAULT_DURATIONS[eventType] ?? fallback;
}

export const WEEKDAYS = [
  { idx: 1, short: "Seg", label: "Segunda" },
  { idx: 2, short: "Ter", label: "Terça" },
  { idx: 3, short: "Qua", label: "Quarta" },
  { idx: 4, short: "Qui", label: "Quinta" },
  { idx: 5, short: "Sex", label: "Sexta" },
  { idx: 6, short: "Sáb", label: "Sábado" },
  { idx: 0, short: "Dom", label: "Domingo" },
];
