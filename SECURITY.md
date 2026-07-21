# SECURITY.md — PsicoRegistro

Este documento descreve as medidas de segurança, suas limitações e o que **ainda não** está mitigado.

## Autenticação

- Senha-mestra criada no primeiro uso (mínimo 8 caracteres).
- Verificação por **Argon2id** (crate `argon2`, RustCrypto) — o hash PHC fica em `users.password_phc`. A senha nunca é gravada em texto puro.
- **Lockout progressivo**: a partir de 3 tentativas incorretas, tempo de espera dobra a cada falha (5s → 10s → 20s …), com teto de 15 minutos (`auth::lockout_seconds`).
- Opção de mostrar/ocultar senha na tela de desbloqueio.
- Aviso explícito, na criação, de que a perda da senha impede a recuperação dos dados.

## Criptografia

- **Derivação de chave**: Argon2id sobre a senha-mestra + `kdf_salt` aleatório por usuário → chave de 32 bytes.
- **Envelope de chave**: uma chave-mestra aleatória de 32 bytes cifra os dados; ela é guardada cifrada (`users.wrapped_key`) pela chave derivada. Trocar a senha reencripta apenas o envelope — os dados não precisam ser recifrados, e a mesma chave-mestra é preservada.
- **Cifra de dados**: **XChaCha20-Poly1305** (AEAD autenticado; crate `chacha20poly1305`), nonce aleatório de 24 bytes por registro. Aplicada a:
  - campos sensíveis de cada entidade (`data_enc`);
  - arquivos de anexo em disco;
  - carga do backup.
- **Nunca** implementamos primitivas criptográficas próprias.
- A chave-mestra existe **apenas em memória** (`state::Inner.key`) e é zerada (`zeroize`) no bloqueio. Não há chave em arquivo de configuração nem no código.

## Bloqueio

- Bloqueio automático por inatividade (padrão 10 min, configurável). O timer do frontend chama o comando `lock`, que zera a chave em memória.
- Bloqueio manual pelo menu.
- Com a aplicação bloqueada, nenhum dado sensível é acessível (as leituras exigem a chave). A tela de desbloqueio não mostra nomes de pacientes ou estudantes.

## Auditoria

- `audit_events` registra: tipo do evento (criação, acesso, alteração, finalização, adendo, exportação, backup, restauração, exclusão, acesso restrito etc.), tipo e id da entidade e a data/hora.
- **Nunca** grava conteúdo clínico, textos de evolução, escores, senhas ou chaves. Verificado por teste (`entities::tests::audit_has_no_content`).

## Anexos

- Armazenados em diretório privado da aplicação (`attachments/`), **cifrados** em repouso.
- Validação de extensão (PDF, JPG, JPEG, PNG, DOCX, ODT) e tamanho (≤ 25 MB). Executáveis são rejeitados.
- **Hash de integridade** BLAKE3 gravado e conferido na leitura.
- Materiais marcados como restritos exigem a área restrita desbloqueada.

## Backup e restauração

- Backup em arquivo único `.prbk`, cifrado com a chave-mestra, com **hash BLAKE3** da carga para verificação de integridade — conferido logo após a gravação.
- Restauração com **confirmação em duas etapas** e senha do backup.
- **Nunca** substitui o banco atual sem antes criar uma cópia de segurança em `pre-restore-<timestamp>/`.

## Exclusão

- Exclusão **lógica** por padrão (`deleted_at`); lixeira com restauração.
- Exclusão **definitiva** exige a senha-mestra e é registrada na auditoria.
- Nada é apagado automaticamente por tempo — a decisão de retenção é sempre do profissional.

## Boas práticas de código

- Todas as consultas SQL são **parametrizadas** (`rusqlite`), sem concatenação. Nomes de tabela/coluna passam por allowlist (`db::spec`, `check_col`).
- Entrada validada no frontend (Zod) e no backend (allowlist de colunas/configurações).
- Erros retornam mensagens genéricas em pt-BR, sem expor caminhos, chaves ou dados pessoais.
- **CSP** restritiva no `tauri.conf.json` (`default-src 'self'`, sem `connect-src` externo).
- Permissões Tauri mínimas (`core:default`, `dialog:allow-open`, `dialog:allow-save`).
- Sem rede, sem telemetria, sem serviços externos. Nada sensível em `localStorage`/`sessionStorage`/`IndexedDB`.

## Ameaças consideradas

- **Roubo do arquivo do banco/anexos**: mitigado por cifragem autenticada com chave derivada da senha.
- **Tentativa de força bruta na senha**: mitigado por Argon2id + lockout progressivo.
- **Adulteração de registros/anexos/backup**: detectada por AEAD (Poly1305) e hash BLAKE3.
- **Vazamento por logs**: auditoria sem conteúdo; erros sem dados sensíveis.
- **Injeção SQL**: eliminada por parametrização + allowlist.
- **Acesso indevido a material de teste**: área restrita separada, exige reconfirmação de senha e expira.

## Ameaças NÃO mitigadas (limitações conhecidas)

- **Comprometimento do sistema operacional / malware com a app desbloqueada**: enquanto a sessão está aberta, a chave está em memória e um atacante com acesso ao processo poderia lê-la. Bloqueie a aplicação ao se ausentar.
- **Keylogger** capturando a senha-mestra.
- **Perda da senha-mestra**: sem mecanismo de recuperação — por design. Sem backup, os dados são irrecuperáveis.
- **Documentos exportados (PDF, anexos exportados)**: saem da proteção da aplicação; a senha opcional do PDF é a única barreira. O usuário é avisado.
- **Cópias de segurança pré-restauração** (`pre-restore-*`) ficam cifradas, mas acumulam no diretório de dados — cabe ao usuário gerenciá-las.
- **Sem verificação de integridade do binário** da aplicação (assinatura de código não incluída nesta versão).
- **Metadados estruturais** (datas, tipos, status) ficam em claro no banco para permitir índices; não revelam conteúdo clínico, mas revelam a existência e o volume de registros a quem tiver o arquivo.
