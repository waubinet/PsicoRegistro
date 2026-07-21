# Changelog — PsicoRegistro

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/). Versionamento semântico.

## [0.1.0] — 2026-07-21

### Adicionado
- Autenticação local com senha-mestra (Argon2id) e lockout progressivo.
- Criptografia autenticada (XChaCha20-Poly1305) de campos sensíveis, anexos e backups, com chave derivada da senha via envelope.
- Bloqueio automático por inatividade e bloqueio manual.
- Módulo **Prontuário Psicológico**: pacientes, responsáveis, casos (intervenção, psicoterapia, avaliação neuropsicológica), registros de evolução com campos específicos por tipo, autosave de rascunho, finalização imutável e adendos.
- Avaliação neuropsicológica por etapas e **Arquivo Neuropsicológico Restrito** (acesso com reconfirmação de senha, fora das exportações comuns).
- Módulo **Psicologia Escolar**: escolas, turmas, estudantes, registros de atividade (com campos de terceiros quando aplicável), registros institucionais e encaminhamentos.
- Anexos criptografados com validação de tipo/tamanho e hash de integridade (BLAKE3).
- Pesquisa global (sem conteúdo clínico), linhas do tempo, agenda/pendências e estatísticas anonimizadas (supressão de pequenos grupos).
- Exportação em PDF com seleção de campos, senha opcional e aviso de que o arquivo sai da proteção da aplicação.
- Backup criptografado `.prbk` verificado e restauração com confirmação em duas etapas e cópia de segurança automática.
- Auditoria de operações (somente metadados) com tela de histórico.
- Lixeira com exclusão lógica e exclusão definitiva protegida por senha.
- Temas claro/escuro, tamanho de fonte ajustável, navegação por teclado.
- Dados de demonstração fictícios (semear/remover).
- Migrações de banco versionadas.

### Correções durante o desenvolvimento
- Corrigida a migração inicial que recriava `database_migrations` e impediria a inicialização do banco (detectada por teste automatizado).
- Fixado `idna_adapter = "=1.1.0"` (backend unicode-rs) para evitar os crates de dados `icu_*`, cujos build scripts pesados eram bloqueados pelo Smart App Control do Windows — permitindo compilar e gerar o instalador no ambiente do usuário.

### Limitações conhecidas
- Sincronização remota não implementada (arquitetura preparada).
- Assinatura de código do instalador não incluída.
- A geração do instalador e a compilação nativa dependem do ambiente (ver README — Smart App Control no Windows).
