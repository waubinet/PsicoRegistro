/** Vocabulários controlados da aplicação (valores internos → rótulos PT-BR). */

export type Option = { value: string; label: string };

export const CASE_TYPES: Option[] = [
  { value: "intervencao", label: "Intervenção psicológica" },
  { value: "psicoterapia", label: "Psicoterapia" },
  { value: "avaliacao_neuropsicologica", label: "Avaliação neuropsicológica" },
];

export const CASE_STATUS: Option[] = [
  { value: "triagem", label: "Triagem" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "suspenso", label: "Suspenso" },
  { value: "encaminhado", label: "Encaminhado" },
  { value: "encerrado", label: "Encerrado" },
];

export const MODALITIES: Option[] = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "On-line" },
  { value: "domiciliar", label: "Domiciliar" },
  { value: "institucional", label: "Institucional" },
];

export const ENTRY_STATUS: Option[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "finalizado", label: "Finalizado" },
  { value: "corrigido", label: "Corrigido por adendo" },
];

export const PATIENT_STATUS: Option[] = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "arquivado", label: "Arquivado" },
];

export const NEURO_STAGES: Option[] = [
  { value: "entrevista_inicial", label: "Entrevista inicial" },
  { value: "anamnese", label: "Anamnese" },
  { value: "planejamento", label: "Planejamento" },
  { value: "aplicacao", label: "Aplicação de instrumentos" },
  { value: "coleta_complementar", label: "Coleta de informações complementares" },
  { value: "correcao", label: "Correção" },
  { value: "integracao", label: "Integração dos resultados" },
  { value: "devolutiva", label: "Entrevista devolutiva" },
  { value: "documento_final", label: "Documento final" },
  { value: "encerramento", label: "Encerramento" },
];

export const SCHOOL_NETWORKS: Option[] = [
  { value: "municipal", label: "Municipal" },
  { value: "estadual", label: "Estadual" },
  { value: "federal", label: "Federal" },
  { value: "privada", label: "Privada" },
  { value: "outra", label: "Outra" },
];

export const STUDENT_STATUS: Option[] = [
  { value: "aguardando", label: "Aguardando" },
  { value: "em_acompanhamento", label: "Em acompanhamento" },
  { value: "orientacao_pontual", label: "Orientação pontual" },
  { value: "encaminhado", label: "Encaminhado" },
  { value: "encerrado", label: "Encerrado" },
  { value: "transferido", label: "Transferido" },
];

export const SCHOOL_ACTIVITY_TYPES: Option[] = [
  { value: "escuta", label: "Escuta psicológica" },
  { value: "acolhimento", label: "Acolhimento" },
  { value: "orientacao", label: "Orientação" },
  { value: "observacao", label: "Observação escolar" },
  { value: "conversa_responsaveis", label: "Conversa com responsáveis" },
  { value: "reuniao_professor", label: "Reunião com professor" },
  { value: "reuniao_coordenacao", label: "Reunião com coordenação" },
  { value: "reuniao_multiprofissional", label: "Reunião multiprofissional" },
  { value: "intervencao_individual", label: "Intervenção individual" },
  { value: "intervencao_grupal", label: "Intervenção grupal" },
  { value: "psicoeducativa", label: "Atividade psicoeducativa" },
  { value: "mediacao", label: "Mediação" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "ficha_encaminhamento", label: "Ficha de encaminhamento" },
  { value: "retorno", label: "Retorno" },
  { value: "acompanhamento", label: "Acompanhamento" },
  { value: "outro", label: "Outro" },
];

/** Tipos que envolvem terceiros (mostram campos de participante). */
export const THIRD_PARTY_TYPES = [
  "conversa_responsaveis",
  "reuniao_professor",
  "reuniao_coordenacao",
  "reuniao_multiprofissional",
];

export const REFERRAL_AREAS: Option[] = [
  { value: "psicologia_clinica", label: "Psicologia clínica" },
  { value: "neuropsicologia", label: "Neuropsicologia" },
  { value: "psiquiatria", label: "Psiquiatria" },
  { value: "neurologia", label: "Neurologia" },
  { value: "pediatria", label: "Pediatria" },
  { value: "fonoaudiologia", label: "Fonoaudiologia" },
  { value: "terapia_ocupacional", label: "Terapia ocupacional" },
  { value: "assistencia_social", label: "Assistência social" },
  { value: "conselho_tutelar", label: "Conselho Tutelar" },
  { value: "rede_protecao", label: "Rede de proteção" },
  { value: "outro", label: "Outro" },
];

export const REFERRAL_STATUS: Option[] = [
  { value: "planejado", label: "Planejado" },
  { value: "responsavel_orientado", label: "Responsável orientado" },
  { value: "entregue", label: "Entregue" },
  { value: "agendado", label: "Agendado" },
  { value: "em_acompanhamento", label: "Em acompanhamento" },
  { value: "concluido", label: "Concluído" },
  { value: "sem_retorno", label: "Sem retorno" },
  { value: "recusado", label: "Recusado" },
];

export const INSTITUTIONAL_TYPES: Option[] = [
  { value: "ocorrencia_visita", label: "Ocorrência de visita" },
  { value: "reuniao_institucional", label: "Reunião institucional" },
  { value: "formacao_professores", label: "Formação de professores" },
  { value: "projeto", label: "Projeto" },
  { value: "roda_conversa", label: "Roda de conversa" },
  { value: "observacao_turma", label: "Observação de turma" },
  { value: "intervencao_coletiva", label: "Intervenção coletiva" },
  { value: "discussao_fluxo", label: "Discussão de fluxo" },
  { value: "articulacao_rede", label: "Articulação com a rede" },
  { value: "planejamento", label: "Planejamento" },
  { value: "devolutiva_institucional", label: "Devolutiva institucional" },
];

export const REMINDER_TYPES: Option[] = [
  { value: "proxima_sessao", label: "Próxima sessão" },
  { value: "retorno_escolar", label: "Retorno escolar" },
  { value: "contato_responsavel", label: "Contato com responsável" },
  { value: "contato_professor", label: "Contato com professor" },
  { value: "verificacao_encaminhamento", label: "Verificação de encaminhamento" },
  { value: "devolutiva", label: "Entrevista devolutiva" },
  { value: "documento", label: "Documento pendente" },
  { value: "backup", label: "Backup" },
  { value: "outro", label: "Outro" },
];

export const PRIORITIES: Option[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export const REMINDER_STATUS: Option[] = [
  { value: "pendente", label: "Pendente" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

export const SHIFTS: Option[] = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
  { value: "noturno", label: "Noturno" },
  { value: "integral", label: "Integral" },
];

export function labelOf(options: Option[], value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
