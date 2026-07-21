# Backup e restauração — PsicoRegistro

## Backup

1. Menu **Backup** → **Criar backup agora**.
2. Escolha onde salvar o arquivo `.prbk`.
3. O sistema gera uma cópia consistente do banco (`VACUUM INTO`), reúne os anexos, cifra tudo com a sua chave-mestra e grava um **hash de integridade** (BLAKE3).
4. Logo após gravar, o arquivo é relido e verificado. Só então o backup é dado como concluído.
5. O painel inicial passa a mostrar a data do último backup.

O arquivo `.prbk` contém:
- cabeçalho em claro: `kdf_salt` e `wrapped_key` (necessários para derivar a chave na restauração), hash da carga e data;
- carga cifrada (XChaCha20-Poly1305): o banco SQLite (base64) e todos os anexos (base64).

> Sem a senha-mestra usada no momento do backup, o arquivo **não pode ser aberto**. Guarde a senha.

## Restauração

1. Menu **Backup** → **Selecionar arquivo de backup**.
2. **Etapa 1/2**: confirmação de que os dados atuais serão substituídos (uma cópia de segurança é criada automaticamente).
3. **Etapa 2/2**: digite a senha-mestra usada no backup.
4. Antes de qualquer substituição, o estado atual é copiado para `pre-restore-<AAAAMMDD-HHMMSS>/` no diretório de dados.
5. O banco e os anexos são substituídos e a aplicação é bloqueada para recarregar com segurança.

## Onde ficam os dados

- Banco: `%APPDATA%\br.com.psicoregistro.app\psicoregistro.db`
- Anexos: `%APPDATA%\br.com.psicoregistro.app\attachments\`
- Cópias pré-restauração: `%APPDATA%\br.com.psicoregistro.app\pre-restore-*\`

(No Windows, `%APPDATA%` costuma ser `C:\Users\<você>\AppData\Roaming`.)

## Recomendações

- Faça backups regulares (há um lembrete configurável e um aviso no painel quando o último backup tem mais de 7 dias).
- Guarde o `.prbk` em local seguro e **lembre-se da senha** — não há recuperação sem ela.
- Periodicamente, remova cópias `pre-restore-*` antigas que não sejam mais necessárias.
