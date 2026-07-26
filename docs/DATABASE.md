# Modelo de dados — PsicoRegistro

Banco: **SQLite** local (`%APPDATA%/br.com.psicoregistro.app/psicoregistro.db`), WAL, `foreign_keys=ON`.

## Convenções

- **PK** `id TEXT` — UUID v4.
- **Datas** em ISO 8601 (UTC) nas colunas `created_at`, `updated_at`; exibição em pt-BR.
- **Exclusão lógica** via `deleted_at TEXT NULL`.
- **Campos sensíveis** não ficam em texto puro: cada entidade tem `data_enc BLOB` com o JSON dos campos sensíveis cifrado (XChaCha20-Poly1305). Só colunas estruturais (FKs, status, tipos, datas de filtro) ficam em claro, para permitir índices e integridade.
- `is_demo INTEGER` marca dados de demonstração.
- Consultas sempre parametrizadas; nomes de tabela/coluna passam por allowlist no Rust.

## Diagrama (entidade-relacionamento)

```mermaid
erDiagram
    users ||--o| professional_profiles : "perfil"
    patients ||--o{ patient_guardians : "responsáveis"
    patients ||--o{ clinical_cases : "casos"
    clinical_cases ||--o{ clinical_entries : "evoluções"
    clinical_entries ||--o{ clinical_entry_addenda : "adendos"
    clinical_cases ||--o{ neuropsych_assessments : "sessões neuro"
    clinical_cases ||--o{ restricted_neuropsych_records : "arquivo restrito"
    neuropsych_assessments }o--o{ neuropsych_instruments : "instrumentos"

    schools ||--o{ school_classes : "turmas"
    schools ||--o{ students : "estudantes"
    schools ||--o{ institutional_school_records : "registros institucionais"
    students ||--o{ student_guardians : "responsáveis"
    students ||--o{ school_records : "registros"
    students ||--o{ referrals : "encaminhamentos"
    schools ||--o{ referrals : "encaminhamentos"

    school_records ||--o{ record_participants : "participantes"
    clinical_entries ||--o{ record_participants : "participantes"

    patients ||--o{ attachments : "anexos"
    students ||--o{ attachments : "anexos"
    reminders }o--o| students : "vínculo"
    reminders }o--o| patients : "vínculo"

    audit_events }o--|| users : "gerado por"
    deleted_items }o--|| users : "lixeira"
```

## Tabelas

### Núcleo / segurança
| Tabela | Colunas em claro | Conteúdo cifrado (`data_enc`) |
|---|---|---|
| `users` | `password_phc`, `kdf_salt`, `wrapped_key`, `failed_attempts`, `locked_until` | — (envelope de chave; sem PII) |
| `app_settings` | `key`, `value` | preferências não sensíveis (tema, fonte, último backup) |
| `professional_profiles` | — | nome, CRP, contato, instituição, logotipo |
| `audit_events` | `event_type`, `entity_kind`, `entity_id`, `detail`, `created_at` | — (apenas metadados) |
| `deleted_items` | `entity_kind`, `entity_id`, `deleted_at`, `purged_at` | — |
| `database_migrations` | `version`, `applied_at` | — |

### Prontuário clínico
| Tabela | Colunas em claro | Cifrado |
|---|---|---|
| `patients` | `status` | nome, nome social, nascimento, CPF, contatos, endereço, ocupação, responsáveis, observações |
| `patient_guardians` | `patient_id` | nome, relação, telefone |
| `clinical_cases` | `patient_id`, `case_type`, `status`, `start_date`, `end_date` | demanda, origem, objetivos, contexto, modalidade, frequência, encerramento |
| `clinical_entries` | `case_id`, `entry_type`, `status`, `entry_date`, `followup_date` | todos os campos de evolução (comuns + específicos por tipo) |
| `clinical_entry_addenda` | `entry_id` | motivo, conteúdo do adendo |
| `neuropsych_assessments` | `case_id`, `stage`, `status`, `session_date` | objetivos, informantes, achados (uso reservado; sessões usam `clinical_entries`) |
| `neuropsych_instruments` | — | catálogo de instrumentos (metadados, sem itens de teste) |
| `restricted_neuropsych_records` | `case_id`, `applied_date` | instrumento, edição, escores e classificações digitados, observações técnicas |

### Psicologia escolar
| Tabela | Colunas em claro | Cifrado |
|---|---|---|
| `schools` | `status`, `network` | nome, INEP, endereço, contatos, direção, coordenação, turnos |
| `school_classes` | `school_id` | nome da turma, turno |
| `students` | `school_id`, `status`, `grade`, `shift` | nome, nascimento, matrícula, professor, responsáveis, demanda |
| `student_guardians` | `student_id` | nome, relação, contatos |
| `school_records` | `student_id`, `school_id`, `activity_type`, `status`, `record_date`, `followup_date`, `restriction_level` | situação, objetivo, ações, orientações, contatos, participantes |
| `institutional_school_records` | `school_id`, `record_type`, `record_date` | público, participantes, demanda, objetivo, atividade, resultados |
| `record_participants` | `record_id`, `record_kind` | nome, função, meio de contato, combinações |
| `referrals` | `student_id`, `school_id`, `status`, `referral_date`, `area`, `next_check_date` | destino, motivo, comunicação, retorno, resultado |

### Agenda (migração `0002_agenda`)

Migração **puramente aditiva**: cria tabelas novas e índices, sem tocar em dados existentes.

| Tabela | Colunas em claro | Cifrado |
|---|---|---|
| `agenda_events` | `event_context`, `event_type`, `status`, `event_date`, `start_at`, `end_at`, `patient_id`, `clinical_case_id`, `student_id`, `school_id`, `class_id`, `referral_id`, `clinical_entry_id`, `school_record_id`, `recurrence_id`, `import_batch_id`, `neuro_stage`, `origin` | título, local, observação administrativa |
| `agenda_recurrences` | `frequency`, `interval_n`, `days_of_week`, `start_date`, `end_date`, `count_n` | — |
| `agenda_imports` | `source_hash`, `imported_at`, `total_rows`, `imported_rows`, `ignored_rows`, `error_rows` | nome do arquivo |
| `person_links` | `student_id`, `patient_id` | — (vínculo sempre explícito) |
| `agenda_absences` | `kind`, `start_date`, `end_date` | descrição |

**Integridade**: excluir um evento nunca exclui paciente, estudante, escola ou registro. Arquivar
uma pessoa preserva o histórico. `clinical_entry_id` / `school_record_id` mantêm o vínculo do
registro criado a partir do compromisso.

**Privacidade**: a agenda guarda só dado administrativo — nunca relato, hipótese diagnóstica,
resultado de teste ou escore.

Índices: `idx_agenda_data`, `idx_agenda_inicio`, `idx_agenda_paciente`, `idx_agenda_estudante`,
`idx_agenda_escola`, `idx_agenda_caso`, `idx_agenda_recorrencia`, `idx_agenda_status`,
`idx_person_links_*`, `idx_ausencias`.

### Suporte
| Tabela | Colunas em claro | Cifrado |
|---|---|---|
| `reminders` | `due_date`, `status`, `reminder_type`, `priority`, `linked_kind`, `linked_id` | título, descrição administrativa |
| `attachments` | `owner_kind`, `owner_id`, `ext`, `size_bytes`, `hash`, `restricted` | nome original (blob do arquivo cifrado em `attachments/<id>.bin`) |
| `exports` | `export_type`, `target_kind`, `target_id` | — |

## Índices

`idx_cases_patient`, `idx_entries_case`, `idx_entries_date`, `idx_students_school`,
`idx_srecords_student`, `idx_srecords_date`, `idx_referrals_student`, `idx_referrals_status`,
`idx_reminders_due`, `idx_attach_owner`, `idx_audit_created`.

## Migrações

Versionadas em `database_migrations`. A migração `0001_initial` cria as tabelas de núcleo; as tabelas de entidade são criadas idempotentemente a cada inicialização (DDL derivada de `db::TABLES`). Novas alterações de esquema devem ser adicionadas como novas entradas em `MIGRATIONS` (`src-tauri/src/db.rs`).
