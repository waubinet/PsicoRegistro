# SECURITY.md — PsicoRegistro

Este documento descreve, com franqueza, o que a aplicação protege e **o que ela não protege**.

## ⚠ Modo sem senha (configuração atual)

Esta versão foi deliberadamente configurada para **abrir sem qualquer senha**, a pedido do usuário, para uso pessoal em máquina própria.

Consequências, sem rodeios:

- A chave de criptografia é gerada na primeira execução e guardada **em claro** no próprio banco (`app_settings.master_key`).
- Portanto, **quem tiver acesso aos arquivos consegue ler todo o conteúdo** — prontuários, registros escolares e anexos. Copiar a pasta de dados para um pendrive é suficiente.
- O arquivo de backup `.prbk` **carrega a chave no cabeçalho**: qualquer cópia dele é legível por qualquer pessoa.
- A única barreira efetiva é o **controle de acesso do sistema operacional** (a senha da conta Windows) e a segurança física do computador.

**Implicações profissionais:** a Resolução CFP nº 01/2009 e a LGPD atribuem ao profissional o dever de guarda e sigilo dos registros. Neste modo, esse dever recai **inteiramente sobre medidas externas ao aplicativo**: senha de conta do Windows, criptografia de disco (BitLocker), controle de acesso físico e cuidado com backups. Se o computador for compartilhado, perdido, roubado ou levado à assistência técnica, os dados estarão acessíveis.

**Recomendação:** ative a **criptografia de disco do Windows (BitLocker)**. É a proteção que efetivamente substitui a senha do aplicativo neste cenário.

### Reativando a proteção por senha

O mecanismo de senha continua implementado em `src-tauri/src/auth.rs` (Argon2id, envelope de chave, lockout progressivo) — apenas desativado. Para reativar, basta voltar a usar `auth::create_user`/`auth::unlock` no lugar de `auth::local_key` e restaurar a tela de desbloqueio. **Isto é obrigatório caso a aplicação venha a ser distribuída ou comercializada.**

## O que continua protegido

### Criptografia em repouso (parcial)
- Campos sensíveis, anexos e backups são cifrados com **XChaCha20-Poly1305** (AEAD autenticado), nonce aleatório de 24 bytes por registro.
- **Valor real:** protege contra leitura acidental do arquivo por ferramentas comuns e detecta adulteração. **Não** protege contra alguém com acesso aos arquivos, pois a chave está junto.

### Integridade
- AEAD (Poly1305) detecta qualquer adulteração de registros e anexos.
- Anexos têm hash **BLAKE3** conferido na leitura.
- Backups têm hash BLAKE3 da carga, verificado logo após a gravação.
- Um registro que não decifra é ignorado na listagem, sem derrubar a consulta.

### Auditoria
- `audit_events` registra tipo do evento, entidade, id e data/hora.
- **Nunca** grava conteúdo clínico, textos de evolução ou escores. Verificado por teste automatizado (`entities::tests::audit_has_no_content`).

### Anexos
- Diretório privado da aplicação; validação de extensão (PDF, JPG, JPEG, PNG, DOCX, ODT) e tamanho (≤ 25 MB). Executáveis rejeitados.

### Backup e restauração
- Backup em arquivo único `.prbk`, verificado após a gravação.
- Restauração com confirmação em duas etapas.
- **Nunca** substitui o banco atual sem antes criar cópia em `pre-restore-<timestamp>/`.

### Exclusão
- Exclusão lógica por padrão, com lixeira e restauração.
- Exclusão definitiva exige confirmação explícita e é registrada na auditoria.
- Nada é apagado automaticamente por tempo — a decisão é sempre do profissional.

### Área neuropsicológica restrita
- Separada do prontuário geral, com confirmação para abrir, expiração automática e registro na auditoria.
- Excluída das exportações comuns.

### Boas práticas de código
- Consultas SQL **parametrizadas** (`rusqlite`); nomes de tabela/coluna por allowlist.
- Validação de entrada no frontend (Zod) e no backend (allowlist).
- Erros genéricos em pt-BR, sem expor caminhos ou dados pessoais.
- **CSP** restritiva; permissões Tauri mínimas.
- Sem telemetria. A única conexão de rede é o verificador de atualizações (GitHub), que baixa apenas binários assinados e **não envia dado algum**.

## Ameaças NÃO mitigadas

- **Acesso aos arquivos** (cópia da pasta de dados, disco removido, backup extraviado) → **leitura completa dos dados**. Este é o risco central do modo sem senha.
- **Outro usuário com acesso à sua sessão do Windows** desbloqueada.
- **Malware** com acesso ao sistema de arquivos ou ao processo.
- **Documentos exportados** (PDF, anexos) saem da proteção da aplicação; a senha opcional do PDF é a única barreira.
- **Sem assinatura de código** do binário e do instalador.
- **Metadados estruturais** (datas, tipos, status) ficam em claro para permitir índices.
