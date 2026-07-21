# Arquitetura — PsicoRegistro

## Visão geral

Aplicação **desktop local-first** (Tauri 2) para Windows, sem backend remoto. Duas camadas:

- **Backend (Rust / `src-tauri`)** — única superfície de acesso a dados. Detém a conexão SQLite e a chave-mestra (em memória). Expõe comandos IPC (`#[tauri::command]`).
- **Frontend (React + TypeScript / `src`)** — UI. Não acessa o banco diretamente; tudo via `invoke` para os comandos Rust.

```
React (Vite)  --invoke-->  Comandos Tauri (Rust)  -->  SQLite + FS cifrado
   |  Zod/RHF                   |  rusqlite (params!)        %APPDATA%/br.com.psicoregistro.app/
   |  Zustand                   |  crypto (Argon2id/XChaCha20)  ├─ psicoregistro.db
   |  Tailwind/Radix            |  auditoria/backup/anexos      └─ attachments/*.bin
```

## Backend — módulos

| Módulo | Responsabilidade |
|---|---|
| `crypto` | Argon2id (hash e KDF), XChaCha20-Poly1305 (AEAD), utilitários de aleatoriedade |
| `db` | Abertura do banco, migrações versionadas, especificação (allowlist) das tabelas |
| `state` | `AppState`: conexão, chave-mestra em memória, janela de acesso restrito |
| `auth` | Senha-mestra, envelope de chave, lockout progressivo, troca de senha |
| `entities` | CRUD genérico cifrado, exclusão lógica/restauração/purge, imutabilidade de registros finalizados |
| `audit` | Registro e consulta de eventos (somente metadados) |
| `attachments` | Validação, cifragem, hash de integridade, leitura/exportação |
| `backup` | Backup `.prbk` cifrado e verificado; restauração com cópia de segurança |
| `search` | Pesquisa global acento-insensível, retornando só identificação |
| `demo` | Semear/remover dados fictícios |
| `lib` | Registro dos comandos Tauri e bootstrap |

### Padrão de acesso

`with_open()` obtém, sob `Mutex`, a conexão e a chave; todo comando de dados passa por ele — logo, dados só são lidos/escritos com a sessão desbloqueada. `guard_restricted()` exige a janela de acesso para tabelas marcadas como restritas (`restricted_neuropsych_records`).

### Modelo de armazenamento cifrado

Cada entidade guarda colunas estruturais em claro (para índices/filtros) e o restante como JSON cifrado em `data_enc`. `entities::split_payload` separa os campos permitidos (allowlist `db::TABLES[*].plain`) do conteúdo sensível; `row_to_json` recompõe decifrando.

## Frontend — estrutura

| Pasta | Conteúdo |
|---|---|
| `lib/` | `api.ts` (wrapper de `invoke`), `format.ts` (datas BR/ISO, idade, duração), `options.ts` (vocabulários), `entryFields.ts` (campos por tipo), `useEntities.ts`, `localSearch.ts` |
| `store/` | `session.ts` (Zustand: estado da sessão, tema, fonte, bloqueio) |
| `components/` | `Layout`, `FormBuilder` (formulários declarativos Zod+RHF), `ui` (modais, toasts), `Timeline`, `Attachments`, `ExportDialog` |
| `pages/` | Telas: `Unlock`, `Dashboard`, pacientes/casos, escolas/estudantes, `NeuroPanel`, encaminhamentos, pendências, pesquisa, estatísticas, backup, auditoria, lixeira, configurações |

O roteamento usa `HashRouter` (compatível com o protocolo `tauri://`). O bloqueio por inatividade vive no `Layout` (timer reiniciado por eventos de interação).

## Fluxos de dados representativos

- **Registro de evolução**: rascunho com autosave (3s) → `entity_create/update` → finalização (`finalize_entry`, imutável) → correções por `add_addendum` (marca status `corrigido`, preserva original).
- **Área restrita**: `restricted_unlock` (reconfirma senha, janela de 10 min, auditado) → CRUD em `restricted_neuropsych_records` → excluído de exportações comuns.
- **Backup/restauração**: `backup_create` (VACUUM INTO + cifra + verifica) → `backup_restore` (fecha conexão, cópia de segurança, substitui, reabre).

## Preparação para sincronização futura (não implementada)

UUIDs, timestamps ISO 8601, exclusão lógica e a tabela de migrações permitem evoluir para replicação opcional sem alterar o modelo. Nenhuma sincronização existe nesta versão.
