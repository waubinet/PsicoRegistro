# Agenda — PsicoRegistro

A Agenda é a **camada de integração** entre o Prontuário Psicológico e a Psicologia Escolar.
Ela guarda apenas informação administrativa; conteúdo clínico vive no prontuário.

## Visualizações

| Vista | Uso |
|---|---|
| **Semana** (padrão) | grade de segunda a domingo, horários na lateral |
| Hoje | compromissos do dia com ações rápidas |
| Dia | um dia específico |
| Mês | visão geral; clicar num dia abre a vista diária |
| Lista | todos os compromissos, mais recentes primeiro |

A faixa de horário exibida (padrão **07:00–22:00**) é configurável em Configurações.

Na grade semanal: **clique num espaço vazio** para criar um compromisso naquele horário;
**clique num compromisso** para abri-lo.

## Tipos de compromisso

- **Clínica**: psicoterapia, avaliação neuropsicológica, intervenção, entrevista, anamnese,
  devolutiva, orientação, outro.
- **Psicologia Escolar**: escuta, acolhimento, observação, intervenção individual/grupal, conversa
  com responsável, conversa com professor, reunião com coordenação, reunião multiprofissional,
  encaminhamento, acompanhamento, atividade institucional, outro.
- **Outros**: reunião, compromisso administrativo, horário bloqueado, evento pessoal, outro.

**Situações**: agendado, confirmado, realizado, cancelado, faltou, remarcado, aguardando, bloqueado.

## Vínculos automáticos

Ao escolher a pessoa, o sistema traz o que já está cadastrado — sem redigitar:

- **Paciente** → lista os **casos ativos** para vincular.
- **Estudante** → preenche **escola** e **turma** a partir do cadastro (por id, sem duplicar dados).

Compromissos de **avaliação neuropsicológica** permitem indicar a etapa (entrevista, anamnese,
aplicação, correção, integração, devolutiva).

## Registrar atendimento a partir do compromisso

Este é o fluxo principal. No compromisso, **"Registrar atendimento"** abre o formulário do
registro já preenchido com **data, horário de início e fim** (e a etapa, na avaliação
neuropsicológica). Você preenche apenas o conteúdo profissional.

Ao salvar:
- o compromisso passa a **Realizado**;
- evento e registro ficam **vinculados nos dois sentidos** (`clinical_entry_id` /
  `school_record_id`);
- o compromisso exibe **✓ registro**.

Compromisso clínico exige um **caso** vinculado; compromisso escolar exige um **estudante**.

## Recorrência

Frequências: toda semana, a cada 2 semanas, todo mês, intervalo personalizado (em dias).
Defina **data final** ou **número de ocorrências** (sem nenhum dos dois, gera até 1 ano).

A série é materializada em compromissos individuais — assim, **cancelar ou marcar falta em um
atendimento não afeta os demais**.

Na recorrência mensal, meses sem o dia escolhido (ex.: dia 31) são **pulados**, nunca deslocados.

## Conflitos de horário

Ao salvar, sobreposições são detectadas e exibidas — mas **não bloqueiam**: você pode
**"Agendar mesmo assim"**, já que algumas atividades legitimamente se sobrepõem.
Encostar (14:00–14:50 e 14:50–15:40) não é conflito. Cancelados e remarcados são ignorados.

## Onde a agenda aparece

- **Painel**: seção **Hoje**, com o próximo atendimento destacado e ações rápidas.
- **Paciente / Caso / Estudante / Escola**: próximos atendimentos e anteriores, com indicação de
  registro vinculado.
- **Resumo da semana**: total, realizados, restantes, faltas e — o indicador mais útil —
  **atendimentos realizados sem registro**.

## Agenda × Pendências

São coisas distintas e continuam separadas:

- **Agenda** = compromissos com data e horário.
- **Pendências** = tarefas a fazer (retorno de encaminhamento, contato, documento).

O módulo de pendências existente foi preservado.

## Privacidade

A agenda guarda: pessoa, horário, tipo, local, situação e uma observação administrativa curta
(140 caracteres). **Nunca** relato de sessão, hipótese diagnóstica, resultado de teste ou escore.
