# UPGRADE-PLAN.md — PsicoRegistro 0.1.1 → 0.2.0

Plano de atualização **sobre o projeto existente**. Nenhuma reescrita, nenhuma perda de dados,
nenhuma reativação da senha do aplicativo.

Ponto de rollback: commit `bece109` (branch `main`, publicado em github.com/waubinet/PsicoRegistro).

---

## 1. O que já existe (auditoria)

### Arquitetura
- **Tauri 2** (Rust) + **React 18 / TypeScript strict** + Vite + Tailwind + Radix.
- Backend detém a conexão SQLite e a chave; frontend acessa só por comandos IPC (`invoke`).
- Estado de sessão em Zustand; rotas em `HashRouter`.

### Banco (`src-tauri/src/db.rs`)
- Migrações versionadas em `database_migrations`; hoje existe apenas `0001_initial`.
- Tabelas de núcleo: `users` (legado, vazia), `app_settings`, `audit_events`, `deleted_items`.
- 20 tabelas de entidade declaradas em `db::TABLES`, criadas idempotentemente pela DDL derivada.
- **Modelo de armazenamento**: colunas estruturais em claro (FKs, status, datas — para índices e
  filtros) + `data_enc BLOB` com o JSON dos campos sensíveis cifrado (XChaCha20-Poly1305).
- CRUD genérico em `entities.rs` com **allowlist** de tabela/coluna e queries parametrizadas.
- Registro que não decifra é ignorado na listagem (não derruba a consulta).

### Chave / segurança atual
- `auth::local_key()` lê `app_settings.master_key` (**base64 em texto puro**) ou gera na 1ª execução.
- Sem senha, sem tela de login, sem bloqueio — decisão de produto já tomada e **mantida**.
- Funções de senha (Argon2id, envelope, lockout) permanecem em `auth.rs`, desativadas.
- Auditoria só com metadados (teste garante ausência de conteúdo).

### Agenda/pendências hoje
- `reminders` (due_date, status, reminder_type, priority, linked_kind, linked_id) — **lista de
  tarefas**, sem horário, sem calendário, sem vínculo com registros.

### Backup
- `.prbk` = MAGIC + header JSON + ciphertext. Header carrega **a chave em base64** (modo sem senha).
- Verificação BLAKE3 após gravar; restauração faz cópia `pre-restore-*` antes de substituir.
- Backup automático por pasta/intervalo com rotação (implementado nesta série).

### Já verificado neste ambiente
- **DPAPI CurrentUser funciona**: chave 32 B → blob 262 B, roundtrip íntegro (teste PowerShell).
- **Agenda real** (5 arquivos `.docx` em `Documentos/02 Pessoal/Trabalho`): cabeçalho com
  `Data: dd/mm/aaaa` e `Dia da semana`, seguido de **duas tabelas** (MATUTINO / VESPERTINO) com
  colunas `HORÁRIO | NOME COMPLETO | P/F | CONTATO | SESSÕES | ESCOLA | RESPONSÁVEL`.
  Linhas vazias são comuns (horários livres) e devem ser ignoradas.

---

## 2. O que será preservado (sem alteração)

- Ausência de senha, login, bloqueio automático e Windows Hello.
- Todas as 20 tabelas de entidade e seus dados.
- Modelo `data_enc` + allowlist + auditoria de metadados.
- Prontuário, módulo escolar, ocorrência de visita, relatórios, exportações, lixeira, updater.
- Identidade visual: tipografia, componentes (`Modal`, `FormBuilder`, `ui.tsx`), tema, navegação.

---

## 3. O que será alterado

| Área | Mudança | Risco |
|---|---|---|
| Chave | `master_key` (texto puro) → `protected_master_key` (blob DPAPI) | **alto** — mitigado por migração validada em 9 passos |
| `reminders` | preservada; agenda **não** a substitui | baixo |
| Backup | dois formatos explícitos (local DPAPI / portátil com senha) | médio — versão de formato no header |
| Menu | "Agenda e pendências" → "Agenda" + "Pendências" | baixo |

### Migração da chave (Fase 3) — sequência obrigatória
1. Ler `app_settings.master_key`.
2. Carregar a chave.
3. **Validar** que ela decifra um registro existente (canário: primeira linha com `data_enc`).
4. Proteger a MESMA chave com `CryptProtectData` (escopo **CurrentUser**, entropia da aplicação).
5. Gravar `protected_master_key`.
6. Recuperar via `CryptUnprotectData`.
7. Conferir que a chave recuperada é **idêntica** e revalidar a leitura.
8. Só então remover `master_key`.
9. Auditar apenas `key_protected` (nunca a chave).

Qualquer falha → **aborta**, mantém `master_key`, não toca em registro algum.
Se a DPAPI não estiver disponível, o app continua funcionando com a chave em claro (degradação
explícita, registrada na auditoria e visível em Configurações).

---

## 4. Novas tabelas (migração `0002_agenda`)

Seguem o padrão existente (`data_enc`, `is_demo`, timestamps, `deleted_at`) e entram em `db::TABLES`.

- **`agenda_events`** — plain: `event_context`, `event_type`, `status`, `start_at`, `end_at`,
  `patient_id`, `clinical_case_id`, `student_id`, `school_id`, `class_id`, `referral_id`,
  `clinical_entry_id`, `school_record_id`, `recurrence_id`, `import_batch_id`, `neuro_stage`.
  Cifrado: `title`, `location`, `administrative_note`.
- **`agenda_recurrences`** — plain: `frequency`, `interval`, `days_of_week`, `start_date`,
  `end_date`, `count`.
- **`agenda_imports`** — plain: `source_hash`, `imported_at`, `total_rows`, `imported_rows`,
  `ignored_rows`, `error_rows`. Cifrado: `filename`.
- **`person_links`** — plain: `student_id`, `patient_id`. Vínculo **sempre explícito**.
- **`agenda_absences`** — plain: `kind`, `start_date`, `end_date` (férias, feriado, curso).

**Integridade**: excluir evento nunca exclui paciente/estudante/registro. Arquivar pessoa mantém
o histórico. `clinical_entry_id`/`school_record_id` preservam o vínculo criado pela agenda.

**Privacidade**: a agenda guarda apenas dado administrativo. Nada de relato, hipótese, diagnóstico
ou escore — isso vive no prontuário.

---

## 5. Impacto nos dados existentes

- **Nenhum registro é reescrito.** A migração `0002` só executa `CREATE TABLE IF NOT EXISTS`.
- A cifragem dos dados **não muda** — muda apenas onde a chave fica guardada.
- `reminders` continua funcionando; a agenda cria pendências vinculadas quando pertinente.
- Banco atual (dados de teste apagados a pedido) permanece intacto.

## 6. Estratégia de rollback

1. Git: `git reset --hard bece109` restaura o código.
2. Banco: migração é aditiva; `0002` pode coexistir com binário antigo (tabelas apenas ignoradas).
3. Chave: enquanto `master_key` existir, qualquer versão anterior continua abrindo o banco. A
   remoção só ocorre após validação completa — e o backup automático roda antes.
4. Instalador anterior preservado em `Instalador/`.

## 7. Testes necessários

**Segurança**: migração da chave; recuperação via DPAPI; dados antigos legíveis; remoção só após
sucesso; falha aborta sem perda; chave ausente dos logs; app abre sem senha.
**Agenda**: criar/editar/cancelar/remarcar; recorrência e exceção; conflito; exclusão lógica.
**Integração**: evento → evolução (dados pré-preenchidos, vínculo bidirecional); evento → registro
escolar; etapa neuropsicológica.
**Importação**: parser dos `.docx` reais; duplicado; correspondência exata/ambígua/inexistente;
cancelar não grava; reimportar não duplica.
**Backup**: local e portátil, ida e volta.

## 8. Ordem de execução

Fase 1 auditoria ✔ · Fase 2 este plano ✔ · Fase 3 DPAPI · Fase 4 modelo · Fase 5 semana ·
Fase 6 clínica · Fase 7 escolar · Fase 8 recorrência · Fase 9 importador · Fase 10 painel ·
Fase 11 lembretes · Fase 12 backup · Fase 13 testes · Fase 14 build · Fase 15 instalador ·
Fase 16 documentação.

Após cada fase: compilar, rodar testes, corrigir, só então avançar.
