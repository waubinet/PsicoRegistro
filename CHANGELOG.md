# Changelog — PsicoRegistro

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/). Versionamento semântico.

## [0.2.0] — 2026-07-22

### Segurança
- **Chave protegida pela DPAPI do Windows** (escopo do usuário atual). A aplicação continua abrindo
  **sem senha**, mas a chave deixa de ficar em texto puro no banco. Copiar o arquivo para outro
  computador ou conta não dá mais acesso aos dados.
- Migração validada em 9 etapas, com aborto seguro: a chave em claro só é removida após confirmar
  que a mesma chave foi recuperada e que os registros existentes continuam legíveis. Coberta por
  testes, inclusive um de integração sobre **cópia do banco real**.
- A auditoria registra `key_protected` — nunca a chave.

### Agenda (novo módulo)
- Visualizações **Semana** (principal), Hoje, Dia, Mês e Lista, com faixa de horário configurável.
- Compromissos clínicos, escolares e administrativos, com 8 situações.
- **Vínculos automáticos**: paciente → casos ativos; estudante → escola e turma (por id).
- **Registrar atendimento a partir do compromisso**: abre a evolução ou o registro escolar já
  preenchidos com data e horários; ao salvar, evento e registro ficam vinculados nos dois sentidos
  e o compromisso vira "Realizado".
- **Recorrência** semanal, quinzenal, mensal e personalizada, materializada em compromissos
  individuais — cancelar um não afeta a série.
- **Detecção de conflitos** que avisa sem bloquear.
- Agenda visível no paciente, caso, estudante e escola; seção **Hoje** no painel; indicador de
  **atendimentos realizados sem registro**.

### Importação da agenda
- Assistente em etapas para `.docx` (modelo CEAP) e `.csv`, com prévia antes de gravar.
- Correspondência de pessoas: exata é automática; parcial exige confirmação; desconhecida não cria
  cadastro. **Nunca** vincula por semelhança silenciosamente.
- Detecção de duplicados e de reimportação do mesmo arquivo (por hash).
- O arquivo original é lido em **modo somente leitura**.

### Preservado
Prontuário, módulo escolar, ocorrência de visita, relatórios, exportações, backup, auditoria,
lixeira, updater e o módulo de **pendências** (que segue separado da agenda).

## [0.1.0] — 2026-07-21

### Alterado (decisão do usuário)
- **Senha-mestra removida**: o aplicativo abre direto, sem tela de desbloqueio, sem bloqueio por inatividade e sem senha na área restrita, na exclusão definitiva ou na restauração de backup. A chave é gerada na primeira execução e guardada localmente. Os dados seguem cifrados, mas a chave acompanha a máquina — ver [SECURITY.md](SECURITY.md). O mecanismo de senha permanece no código, desativado.
- Ícone redesenhado (Ψ sobre gradiente teal).
- Corrigida a janela de console que abria junto com o aplicativo (`windows_subsystem` agora se aplica também em builds de desenvolvimento).
- Registros que não decifram passam a ser ignorados na listagem, em vez de inviabilizar a consulta inteira.
- Importação de lista nominal de alunos, relatórios por período (bimestral/semestral/anual/individual), ocorrência de visita com modelo das anteriores, e atualização automática via GitHub.

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
