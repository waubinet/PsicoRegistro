# PsicoRegistro

Suíte **desktop local-first** para profissionais de Psicologia, com dois módulos que compartilham segurança, backup e auditoria, mas mantêm os dados logicamente separados:

- **Prontuário Psicológico** — intervenção, psicoterapia e avaliação neuropsicológica.
- **Psicologia Escolar** — escolas, estudantes, registros de atividade, contatos e encaminhamentos.
- **Agenda** — camada que integra os dois: agendar, registrar o atendimento a partir do
  compromisso e importar as agendas já existentes. Ver [docs/AGENDA.md](docs/AGENDA.md) e
  [docs/AGENDA-IMPORT.md](docs/AGENDA-IMPORT.md).

Aplicação **Tauri 2 + React + TypeScript + SQLite**, offline e sem telemetria. A única conexão de rede é o verificador de atualizações (GitHub), que baixa apenas binários assinados e não envia dado algum.

> 🔓 **Sem senha, com a chave protegida pelo Windows (0.2.0+).** O app abre direto, sem login. A
> chave de criptografia é protegida pela **DPAPI do Windows** na sua conta de usuário — copiar o
> banco para outro computador ou conta **não** dá acesso aos dados. A barreira efetiva passa a ser
> a senha da sua conta Windows; recomenda-se ativar o **BitLocker**. O backup portátil continua
> exigindo senha própria. Detalhes e limites em [SECURITY.md](SECURITY.md).

> ⚠ **Windows — Smart App Control**: se o seu Windows estiver com o **Smart App Control** em modo de imposição, a compilação nativa (`cargo`/`tauri build`) pode falhar com *"Uma política de Controle de Aplicativo bloqueou este arquivo"* (erro 4551), pois ele bloqueia build scripts recém-compilados de algumas dependências. Rode `.\scripts\verificar-projeto.ps1` para detectar. Para compilar, desative o Smart App Control em **Segurança do Windows → Controle de aplicativos e navegador → Configurações de proteção baseada em reputação → Smart App Control → Desativado** (essa ação é uma decisão de segurança sua e só pode ser revertida reinstalando o Windows). O frontend e a lógica do backend são totalmente testáveis sem essa mudança (veja abaixo).

## Requisitos

- **Windows 10/11** (x64). O WebView2 Runtime já vem no Windows 11.
- **Node.js 18+** (testado com Node 24).
- **Rust** (stable, target `x86_64-pc-windows-msvc`) — instale via <https://rustup.rs>.
- **Visual Studio Build Tools** com *Desktop development with C++* (para compilar o backend nativo).

## Instalação

```powershell
# a partir da raiz do projeto
.\scripts\instalar-dependencias.ps1
```

Ou manualmente:

```powershell
npm install
cd src-tauri; cargo fetch; cd ..
```

## Execução (desenvolvimento)

```powershell
.\scripts\executar-desenvolvimento.ps1
# ou
npm run tauri dev
```

A aplicação abre em janela desktop. No primeiro uso, crie a senha-mestra.

## Testes e verificação

```powershell
.\scripts\executar-testes.ps1
```

Executa, em sequência:

- **Verificação de tipos**: `npm run typecheck` (TypeScript strict).
- **Lint**: `npm run lint` (ESLint).
- **Testes do frontend**: `npm run test` (Vitest + Testing Library).
- **Testes do backend**: `cd src-tauri; cargo test` (cripto, autenticação, CRUD cifrado, adendos, backup/restauração, anexos, ausência de conteúdo em logs).

### Status verificado nesta entrega

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` (strict) | ✅ sem erros |
| ESLint | ✅ sem erros |
| Vitest (frontend) | ✅ 9/9 |
| `vite build` (produção) | ✅ gera `dist/` |
| Testes do backend Rust (`cargo test`) | ✅ 22/22 |
| App inicia (binário executa) | ✅ verificado |
| Instalador NSIS + MSI gerado | ✅ ver abaixo |

> Nota sobre o Smart App Control: `cargo test` e o empacotamento em **modo debug** funcionam normalmente. O build **release otimizado** é bloqueado pelo Smart App Control (build script do `wry` recompilado com features de release), por isso o instalador desta entrega foi gerado a partir do perfil de desenvolvimento (`tauri build --debug`) — funcional, apenas não otimizado em tamanho/velocidade. Para o instalador **otimizado**, desative o Smart App Control (ver aviso no topo).

## Build de produção e instalador

```powershell
.\scripts\gerar-instalador.ps1     # tenta release; faz fallback p/ --debug se o SAC bloquear
# ou, explicitamente para o instalador funcional nesta máquina:
npm run tauri build -- --debug
```

Instaladores gerados nesta entrega (perfil debug, funcionais):

```
src-tauri\target\debug\bundle\nsis\PsicoRegistro_0.1.0_x64-setup.exe   (~3,5 MB)
src-tauri\target\debug\bundle\msi\PsicoRegistro_0.1.0_x64_pt-BR.msi    (~5,5 MB)
```

Com o Smart App Control desativado, `npm run tauri build` gera a versão otimizada em `src-tauri\target\release\bundle\`.

## Onde ficam os dados

- Banco: `%APPDATA%\br.com.psicoregistro.app\psicoregistro.db`
- Anexos (cifrados): `%APPDATA%\br.com.psicoregistro.app\attachments\`
- Cópias pré-restauração: `%APPDATA%\br.com.psicoregistro.app\pre-restore-*\`

## Backup e restauração

Veja [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md). Resumo: menu **Backup** cria um `.prbk` cifrado e verificado; a restauração exige a senha do backup e faz cópia de segurança automática antes de substituir.

## Atualizar o sistema sem perder dados

Os dados vivem em `%APPDATA%\br.com.psicoregistro.app\`, **fora** da pasta do aplicativo. Para atualizar:

1. Faça um backup (menu Backup) por precaução.
2. Instale a nova versão (o instalador substitui o binário, não os dados).
3. As migrações de banco são aplicadas automaticamente na primeira abertura.

Reinstalar ou atualizar **não** apaga o banco nem os anexos. Desinstalar o programa também não remove a pasta de dados; para remover tudo, exclua manualmente `%APPDATA%\br.com.psicoregistro.app\` (irreversível).

## Limitações conhecidas

- Sincronização remota **não** implementada (arquitetura preparada com UUIDs, ISO 8601 e exclusão lógica).
- Instalador sem assinatura de código.
- Compilação nativa depende do ambiente Windows (Smart App Control — ver aviso).
- PDFs e anexos exportados ficam fora da proteção da aplicação.

## Documentação

- [PLAN.md](PLAN.md) — arquitetura, fases e critérios.
- [SECURITY.md](SECURITY.md) e [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) — segurança e ameaças.
- [PRIVACY.md](PRIVACY.md) — privacidade e LGPD.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitetura técnica.
- [docs/DATABASE.md](docs/DATABASE.md) — modelo de dados e diagrama.
- [docs/USER-GUIDE.md](docs/USER-GUIDE.md) — guia do usuário.
- [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md) — backup e restauração.
- [CHANGELOG.md](CHANGELOG.md) — histórico de versões.

## Aviso profissional

O PsicoRegistro auxilia o **registro** profissional. Não substitui o julgamento clínico, não emite diagnóstico ou tratamento automático, não transforma hipótese em conclusão e não afirma conformidade jurídica automática. Documentos exportados são recursos técnicos cuja adequação ética/jurídica deve ser avaliada pelo profissional.
