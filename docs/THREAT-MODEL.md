# Modelo de ameaças — PsicoRegistro

> ⚠ **Configuração atual: sem senha.** A chave de criptografia fica guardada junto com os dados. Logo, **todo cenário que envolva acesso aos arquivos resulta em leitura completa dos registros**. As mitigações abaixo marcadas com † deixam de valer neste modo. A proteção efetiva passa a ser o controle de acesso do sistema operacional e a criptografia de disco (BitLocker). Ver [SECURITY.md](../SECURITY.md).

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
| Leitura do banco roubado | cópia de `psicoregistro.db` | † cifrado, mas a chave está no próprio banco → **não mitigado** |
| Leitura de anexos roubados | cópia de `attachments/*.bin` | † cifrado, mas a chave está no banco → **não mitigado** |
| Backup interceptado | cópia do `.prbk` | † a chave viaja no cabeçalho → **não mitigado** |
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
