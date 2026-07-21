# Modelo de ameaças — PsicoRegistro

## Ativos protegidos
- Dados clínicos (evoluções, hipóteses, avaliação de risco).
- Dados escolares e de menores.
- Escores/classificações neuropsicológicas (área restrita).
- Anexos (documentos, imagens).
- Senha-mestra e chave de criptografia.

## Agentes de ameaça considerados
- Terceiro com acesso físico ao arquivo do banco/anexos ou a um backup.
- Atacante tentando adivinhar a senha por força bruta.
- Adulteração de arquivos em repouso.
- Exposição acidental por logs ou exportações.

## Superfícies e mitigações

| Ameaça | Vetor | Mitigação |
|---|---|---|
| Leitura do banco roubado | cópia de `psicoregistro.db` | campos sensíveis cifrados (XChaCha20-Poly1305); chave derivada da senha (Argon2id) |
| Leitura de anexos roubados | cópia de `attachments/*.bin` | arquivos cifrados; hash de integridade |
| Backup interceptado | cópia do `.prbk` | carga cifrada; sem a senha, não abre |
| Força bruta da senha | tentativas repetidas | Argon2id (custo alto) + lockout progressivo |
| Adulteração de dados/anexos/backup | edição do arquivo | AEAD (Poly1305) detecta; BLAKE3 confere integridade |
| Injeção SQL | entrada maliciosa | queries parametrizadas + allowlist de colunas/tabelas |
| Vazamento por logs | auditoria/erros | auditoria só com metadados; erros sem dados sensíveis |
| Acesso indevido a material de teste | navegação comum | área restrita separada, reconfirmação de senha, expira, fora de exportações |
| Exposição em estatísticas | relatórios | anonimização + supressão de grupos < 3 |

## Fora do escopo (não mitigado nesta versão)
- Malware/keylogger no sistema operacional com a app **desbloqueada** (chave em memória).
- Perda da senha-mestra (sem recuperação, por design).
- Segurança dos documentos **exportados** (PDF/anexos) fora da aplicação.
- Ataques ao sistema operacional, à BIOS/firmware ou por hardware.
- Verificação de integridade/assinatura do binário da aplicação.
- Metadados estruturais em claro (datas, tipos, status) revelam volume/existência de registros a quem tenha o arquivo, embora não o conteúdo.

## Pressupostos de confiança
- O sistema operacional e o hardware do usuário são confiáveis quando a app está desbloqueada.
- O usuário protege a senha-mestra e os backups.
- Não há adversário com acesso privilegiado ao processo em execução.
