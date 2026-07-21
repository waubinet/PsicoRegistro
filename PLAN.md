# PLAN.md — PsicoRegistro

Suíte desktop local-first para profissionais de Psicologia (Prontuário Psicológico + Psicologia Escolar).

## 1. Arquitetura

```
┌─────────────────────────────────────────────────────┐
│ Tauri 2 (Rust)                                      │
│  ├── Comandos (IPC) — única superfície de acesso    │
│  │    a dados: auth, crud, backup, export, audit    │
│  ├── SQLite (rusqlite, bundled) — banco local       │
│  ├── Criptografia: Argon2id (KDF) +                 │
│  │    XChaCha20-Poly1305 (campos sensíveis/anexos)  │
│  └── FS privado: %APPDATA%/PsicoRegistro/           │
│       ├── psicoregistro.db                          │
│       └── attachments/ (blobs criptografados)       │
├─────────────────────────────────────────────────────┤
│ Frontend React 18 + TypeScript strict + Vite        │
│  ├── Tailwind CSS + Radix UI primitives             │
│  ├── React Hook Form + Zod                          │
│  ├── Estado: Zustand (sessão, tema, bloqueio)       │
│  └── Nunca persiste dado sensível no navegador      │
└─────────────────────────────────────────────────────┘
```

Princípios:
- **Local-first, sem rede.** Nenhuma chamada externa; CSP restritiva; permissões Tauri mínimas.
- **Toda leitura/escrita passa pelo Rust** via comandos Tauri parametrizados (rusqlite com `params!`, nunca SQL concatenado).
- **Chave de criptografia** derivada da senha-mestra por Argon2id; envelope: master key aleatória cifrada pela chave derivada (permite trocar senha sem recifrar o banco). Chave mantida só em memória; zerada no bloqueio.
- **Separação lógica**: módulos clínico e escolar em tabelas distintas; área neuropsicológica restrita com confirmação adicional (re-digitar senha).
- **Sincronização futura**: UUIDs, timestamps ISO 8601, exclusão lógica e tabela de migrações já preparam replicação; nada de sync agora.

## 2. Modelo de dados (resumo — detalhes em docs/DATABASE.md)

users, app_settings, professional_profiles, patients, patient_guardians,
clinical_cases, clinical_entries, clinical_entry_addenda,
neuropsych_assessments, neuropsych_instruments, restricted_neuropsych_records,
schools, school_classes, students, student_guardians, school_records,
institutional_school_records, record_participants, referrals, reminders,
attachments, exports, audit_events, deleted_items, database_migrations.

Convenções: PK `id TEXT` (UUID v4), `created_at`/`updated_at` ISO 8601 UTC, `deleted_at` p/ exclusão lógica, FKs com `ON DELETE RESTRICT`, índices em campos de busca. Campos sensíveis (textos clínicos, escores) gravados cifrados (coluna `*_enc BLOB`).

## 3. Fases

- **F1** Ambiente, scaffold Tauri+React+TS, banco, migrações, autenticação (senha-mestra, Argon2id, lockout progressivo), bloqueio por inatividade.
- **F2** Layout (menu lateral, temas, fonte ajustável), pacientes, casos, evoluções, finalização + adendos.
- **F3** Avaliação neuropsicológica por etapas, arquivo restrito, anexos criptografados.
- **F4** Escolas, turmas, estudantes, registros escolares, registros institucionais, encaminhamentos.
- **F5** Pesquisa global, linhas do tempo, pendências/agenda, estatísticas anônimas.
- **F6** Exportação PDF, backup criptografado, restauração, auditoria (tela).
- **F7** Testes, revisão de segurança, build de produção, instalador (NSIS/MSI), documentação.

## 4. Critérios de conclusão

Os 20 critérios da seção 17 do briefing, verificados por: `tsc --noEmit`, ESLint, Vitest (unit + integração), `cargo test`, `npm run tauri build` com instalador gerado em `src-tauri/target/release/bundle/`.

## 5. Decisões técnicas

- rusqlite (bundled) em vez de plugin SQL genérico: controle total de parametrização e cifragem por campo.
- chacha20poly1305 (RustCrypto) + argon2 (RustCrypto): bibliotecas auditadas e mantidas.
- Backup = arquivo único `.prbk`: header + SQLite serializado + anexos, tudo cifrado com a master key, com checksum BLAKE3 de integridade.
- PDF gerado no frontend (janela de impressão dedicada) → `window.print()`/Tauri print para PDF; proteção por senha via biblioteca `lopdf`/qpdf não incluída — usar cifragem opcional do arquivo exportado (aviso claro). [Ajustar conforme viabilidade na F6.]
- Autosave de rascunhos a cada 3 s de inatividade de digitação.
- Auditoria grava apenas metadados (tipo, entidade, id, timestamp), nunca conteúdo.
