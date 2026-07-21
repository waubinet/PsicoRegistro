import type { FieldDef } from "@/components/FormBuilder";
import { MODALITIES } from "./options";

/** Campos comuns a todo registro de evolução. */
export const COMMON_ENTRY_FIELDS: FieldDef[] = [
  { name: "entry_date", label: "Data", type: "date", required: true },
  { name: "start_time", label: "Horário inicial", type: "time" },
  { name: "end_time", label: "Horário final", type: "time" },
  { name: "modality", label: "Modalidade", type: "select", options: MODALITIES },
  { name: "location", label: "Local" },
  { name: "attendees", label: "Pessoas presentes" },
  { name: "author", label: "Autor do registro" },
  { name: "theme", label: "Demanda ou tema trabalhado", type: "textarea" },
  { name: "session_objective", label: "Objetivo do encontro", type: "textarea" },
  { name: "procedures", label: "Procedimentos técnico-científicos utilizados", type: "textarea" },
  { name: "summary", label: "Descrição sucinta do trabalho", type: "textarea" },
  { name: "evolution", label: "Resposta ou evolução observada", type: "textarea" },
  { name: "conduct", label: "Condutas tomadas", type: "textarea" },
  { name: "next_plan", label: "Plano para o próximo encontro", type: "textarea" },
  { name: "referrals", label: "Encaminhamentos", type: "textarea" },
  { name: "followup_date", label: "Retorno previsto", type: "date" },
  { name: "tags", label: "Marcadores (separados por vírgula)" },
];

export const INTERVENTION_FIELDS: FieldDef[] = [
  { name: "intervention_context", label: "Contexto da intervenção", type: "textarea" },
  { name: "target_audience", label: "Público-alvo" },
  {
    name: "group_or_individual",
    label: "Formato",
    type: "select",
    options: [
      { value: "individual", label: "Individual" },
      { value: "grupal", label: "Grupal" },
    ],
  },
  { name: "identified_need", label: "Necessidade identificada", type: "textarea" },
  { name: "strategy", label: "Estratégia utilizada", type: "textarea" },
  { name: "activity", label: "Atividade realizada", type: "textarea" },
  { name: "resources", label: "Recursos utilizados", type: "textarea" },
  { name: "participation", label: "Participação dos envolvidos", type: "textarea" },
  { name: "immediate_result", label: "Resultado imediato", type: "textarea" },
  { name: "continuity_need", label: "Necessidade de continuidade", type: "textarea" },
  { name: "articulation", label: "Articulação com outros profissionais", type: "textarea" },
];

export const PSYCHOTHERAPY_FIELDS: FieldDef[] = [
  { name: "main_complaint", label: "Queixa ou tema predominante", type: "textarea" },
  { name: "relevant_report", label: "Relato relevante da pessoa atendida", type: "textarea" },
  { name: "clinical_observations", label: "Observações clínicas", type: "textarea" },
  { name: "interventions", label: "Intervenções realizadas", type: "textarea" },
  { name: "response", label: "Resposta às intervenções", type: "textarea" },
  { name: "resources_changes", label: "Recursos, dificuldades e mudanças percebidas", type: "textarea" },
  {
    name: "working_hypotheses",
    label: "Hipóteses de trabalho (provisórias)",
    type: "textarea",
    help: "Registre como hipóteses provisórias — não são conclusões nem diagnóstico.",
  },
  { name: "therapeutic_plan", label: "Plano terapêutico", type: "textarea" },
  { name: "tasks", label: "Tarefas ou combinações", type: "textarea" },
  { name: "next_focus", label: "Foco do encontro seguinte", type: "textarea" },
  { name: "risk_flag", label: "Marcar avaliação de risco", type: "checkbox" },
];

export const RISK_FIELDS: FieldDef[] = [
  {
    name: "risk_description",
    label: "Descrição (opcional)",
    type: "textarea",
    showIf: (v) => Boolean(v.risk_flag),
  },
  {
    name: "protective_actions",
    label: "Condutas protetivas realizadas",
    type: "textarea",
    showIf: (v) => Boolean(v.risk_flag),
  },
  {
    name: "risk_contacts",
    label: "Contatos realizados",
    type: "textarea",
    showIf: (v) => Boolean(v.risk_flag),
  },
  {
    name: "risk_referral",
    label: "Encaminhamento",
    type: "textarea",
    showIf: (v) => Boolean(v.risk_flag),
  },
  {
    name: "safety_plan",
    label: "Plano de segurança",
    type: "textarea",
    showIf: (v) => Boolean(v.risk_flag),
  },
  {
    name: "risk_reeval_date",
    label: "Data de reavaliação",
    type: "date",
    showIf: (v) => Boolean(v.risk_flag),
  },
];

/** Campos por sessão de avaliação neuropsicológica (não confundir com arquivo restrito). */
export const NEURO_SESSION_FIELDS: FieldDef[] = [
  { name: "objective", label: "Objetivo", type: "textarea" },
  { name: "informants", label: "Informantes presentes" },
  { name: "sources", label: "Fontes consultadas", type: "textarea" },
  { name: "instruments_used", label: "Instrumentos utilizados", type: "textarea" },
  { name: "application_conditions", label: "Data e condições da aplicação", type: "textarea" },
  { name: "behavior", label: "Comportamento durante a avaliação", type: "textarea" },
  { name: "incidents", label: "Intercorrências", type: "textarea" },
  { name: "validity", label: "Validade ou limitações da sessão", type: "textarea" },
  { name: "findings_summary", label: "Síntese dos achados", type: "textarea" },
  { name: "next_steps", label: "Próximos passos", type: "textarea" },
];

export function entryFieldsFor(caseType: string): FieldDef[] {
  if (caseType === "intervencao") return [...COMMON_ENTRY_FIELDS, ...INTERVENTION_FIELDS];
  if (caseType === "psicoterapia")
    return [...COMMON_ENTRY_FIELDS, ...PSYCHOTHERAPY_FIELDS, ...RISK_FIELDS];
  return COMMON_ENTRY_FIELDS;
}
