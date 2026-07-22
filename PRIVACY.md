# PRIVACY.md — PsicoRegistro

O PsicoRegistro é **local-first**: seus dados ficam apenas no seu computador. Não há servidor, nuvem, telemetria, rastreamento, publicidade ou analytics. A única conexão de rede é o verificador de atualizações, que baixa binários assinados e **não envia dado algum**.

> ⚠ **Sem senha no aplicativo.** Por opção do usuário, esta versão abre sem senha e guarda a chave de criptografia junto com os dados. Quem tiver acesso ao computador ou aos arquivos acessa os registros. O dever de guarda e sigilo (Resolução CFP nº 01/2009 e LGPD) depende, aqui, de medidas externas: senha da conta Windows, criptografia de disco (BitLocker), controle de acesso físico e cuidado com os backups. Ver [SECURITY.md](SECURITY.md).

## Princípios adotados (LGPD e ética profissional)

- **Minimização**: nenhum campo essencial é obrigatório além do estritamente necessário (nome). CPF, diagnóstico e CID **não** são obrigatórios.
- **Necessidade**: os formulários evitam estimular relatos excessivos sobre terceiros; campos de participantes pedem apenas o necessário.
- **Finalidade**: os dados servem ao registro profissional; o sistema não emite diagnóstico, tratamento ou conclusão automáticos.
- **Proteção especial de crianças e adolescentes**: dados de estudantes e menores recebem o mesmo nível de cifragem; diagnósticos informados são tratados como informação de terceiros (com data e origem), nunca como confirmação do profissional, e não aparecem em relatórios gerais.
- **Separação**: prontuário clínico, registro escolar, arquivo neuropsicológico restrito e documentos exportados são tratados de forma distinta.
- **Transparência na exportação**: antes de exportar, o sistema mostra o que será incluído e permite desmarcar campos.

## O que NÃO fazemos

- Não enviamos dados para a internet.
- Não usamos serviços externos (Firebase, Supabase etc.).
- Não guardamos dados sensíveis em `localStorage`, `sessionStorage` ou `IndexedDB`.
- Não registramos conteúdo clínico, senhas ou chaves em logs.
- Não reproduzimos itens, estímulos ou pranchas de testes psicológicos protegidos.
- Não incluímos material restrito nem diagnósticos nominais em exportações comuns ou estatísticas.

## Anonimização nas estatísticas

Os relatórios estatísticos são agregados, sem nomes, CPF, contatos ou diagnóstico nominal. Agrupamentos com menos de 3 indivíduos têm os detalhes suprimidos para evitar reidentificação.

## Responsabilidades do usuário

- Guardar a senha-mestra (não há recuperação) e os arquivos de backup.
- Avaliar a adequação ética/jurídica de qualquer documento exportado — o PDF é um recurso técnico, não uma peça automaticamente conforme.
- Gerenciar cópias exportadas, que ficam fora da proteção da aplicação.

## Marco legal considerado

Resolução CFP nº 01/2009 (atualizada pela 05/2010), Resolução CFP nº 06/2019, Código de Ética Profissional do Psicólogo e Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O software auxilia o registro; não substitui o julgamento profissional nem garante conformidade jurídica automática.
