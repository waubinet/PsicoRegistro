# SECURITY.md — PsicoRegistro

Este documento descreve, com franqueza, o que a aplicação protege e **o que ela não protege**.

## Sem senha, com a chave protegida pelo Windows (0.2.0+)

A aplicação **abre direto, sem senha** — decisão de produto para uso pessoal em máquina própria.
Não há tela de login, bloqueio por inatividade nem Windows Hello.

O que mudou na 0.2.0: a chave de criptografia **deixou de ficar em texto puro**. Agora ela é
protegida pela **DPAPI do Windows** no escopo da **conta do usuário atual**
(`CryptProtectData` / `CryptUnprotectData`, com entropia própria da aplicação e sem qualquer
interação). O Windows decifra automaticamente para a sua conta — por isso continua sem senha.

**Ganho real:** copiar o banco para outro computador ou abrir com outra conta do Windows **não dá
mais acesso aos dados**. Antes, bastava copiar o arquivo.

**Limite honesto:** a proteção é da *conta do Windows*. Quem usar **a sua sessão do Windows
desbloqueada** (ou um malware nela) continua com acesso. A senha da conta Windows passa a ser a
barreira efetiva.

### Migração da chave (executada uma única vez)

Ao abrir a versão nova sobre um banco antigo, a **mesma chave** é migrada — os dados existentes
continuam legíveis. A sequência aborta ao primeiro problema, sem tocar em registro algum:

1. lê a chave em texto puro; 2. valida que ela **decifra um registro existente**;
3. protege a mesma chave com DPAPI; 4. grava o blob; 5. recupera pela DPAPI;
6. confere que é **idêntica** e revalida a leitura; 7. **só então** remove a versão em texto puro;
8. audita apenas o evento `key_protected` — **nunca a chave**.

Se a DPAPI estiver indisponível, o app continua funcionando com a chave em claro (degradação
explícita, visível em Configurações). Coberto por testes automatizados.

**Recomendação mantida:** ative o **BitLocker**. A DPAPI protege contra cópia do arquivo; a
criptografia de disco protege contra acesso físico ao computador.

**Implicações profissionais:** a Resolução CFP nº 01/2009 e a LGPD atribuem ao profissional o dever
de guarda e sigilo. Este modo transfere parte da proteção para a conta do Windows — mantenha-a com
senha, e cuidado com backups portáteis.

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
