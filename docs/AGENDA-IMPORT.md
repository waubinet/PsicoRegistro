# Importação da agenda — PsicoRegistro

Traz para o sistema as **Agendas de Atendimento** já existentes, sem redigitação.

## Formatos aceitos

| Formato | Situação |
|---|---|
| **`.docx`** | Suportado — o modelo "AGENDA DE ATENDIMENTO DIÁRIO" (CEAP) |
| **`.csv`** | Suportado — colunas identificadas pelo cabeçalho |
| `.xlsx` / `.xls` / `.ods` / `.ics` | **Não** suportados nesta versão (ver "Limitações") |

O arquivo original é aberto em **modo somente leitura** e nunca é modificado.

## Estrutura reconhecida no `.docx`

O leitor foi construído a partir dos documentos reais:

- Cabeçalho: `Data: dd/mm/aaaa` e `Dia da semana`.
- Duas tabelas (**MATUTINO** e **VESPERTINO**) com as colunas:
  `HORÁRIO | NOME COMPLETO | P/F | CONTATO | SESSÕES | ESCOLA | RESPONSÁVEL`.
- Horários como `8h30`, `13h00` ou `08:30` são normalizados.
- **Linhas sem nome são horários livres** e são ignoradas (contabilizadas na prévia).
- Linhas de cabeçalho repetidas são descartadas.

Se a data estiver ausente ou incompleta (há agenda com apenas `08/10`, sem ano), o assistente
**pede a data** — nada é inventado.

## Etapas do assistente

**Agenda → Importar agenda**

1. **Selecionar arquivo** (diálogo nativo).
2. **Análise** — leitura e detecção de data, horários, nomes, escolas e contatos.
3. **Prévia** — quantos atendimentos foram encontrados, quantos vinculados automaticamente,
   quantos precisam de confirmação, quantos sem cadastro, duplicados e linhas ignoradas.
4. **Relacionar pessoas** — revisão linha a linha.
5. **Resumo** — o que exatamente será gravado.
6. **Confirmar** — só aqui algo é escrito no banco.

Cancelar em qualquer etapa **não grava nada**.

## Correspondência de pessoas

| Classificação | Critério | Comportamento |
|---|---|---|
| **Exato** | nome idêntico (ignorando acento/caixa/pontuação) | vinculado automaticamente |
| **Confirmar** | todos os tokens do nome importado aparecem no cadastrado, com ≥ 2 em comum (ex.: "João Gabriel" ↔ "João Gabriel da Silva"), ou homônimos | **exige escolha** do profissional |
| **Novo** | nenhum candidato | criado **sem vínculo** |

**Nunca** há vínculo por semelhança de forma silenciosa, e **nenhum estudante ou paciente é criado
automaticamente** — cadastre a pessoa antes, se quiser o vínculo.

Cada linha pode ser **pulada** individualmente.

## Duplicados

Antes de gravar, compara **pessoa + data + horário** com o que já existe na agenda. Duplicados são
marcados e **não são gravados**.

O **hash do arquivo** é guardado em `agenda_imports`. Reimportar o mesmo arquivo mostra o aviso
*"Este arquivo já foi importado antes"* — e apenas as novidades entram.

## O que é gravado

Para cada linha importada: data, horário de início, fim (duração padrão do tipo), nome como título,
escola do **cadastro do estudante** (não do texto do arquivo), contato como observação
administrativa, além de `import_batch_id` e `origin = importacao` para rastreabilidade.

## Limitações

- `.xlsx`/`.xls`/`.ods` não são suportados: exigiriam uma biblioteca adicional no backend, e a
  tentativa de adicionar o crate `zip` quebrou a compilação do Tauri neste ambiente. Para planilhas,
  **exporte como CSV** e importe.
- `.ics` (calendário) não implementado.
- A importação assume **uma data por arquivo**, como nos documentos reais.
