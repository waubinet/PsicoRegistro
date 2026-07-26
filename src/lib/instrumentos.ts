/**
 * Base de instrumentos para o planejamento da bateria neuropsicológica.
 * Portada do app bateria-neuro (mesma curadoria), agora integrada ao
 * PsicoRegistro: a idade do paciente vem do cadastro e a bateria escolhida
 * alimenta a etapa de aplicação e o Arquivo Neuropsicológico Restrito.
 *
 * Contém apenas METADADOS dos testes (nome, faixa etária, demanda, status
 * SATEPSI, link do manual). Nunca itens, estímulos ou conteúdo protegido.
 */

export type Respondente = "paciente" | "pais" | "professor" | "obs";
export type StatusInstrumento = "SATEPSI" | "rastreio" | "clinico" | "complementar";

export type Instrumento = {
  id: string;
  nome: string;
  descricao: string;
  respondente: Respondente;
  tipo: string;
  demandas: string[];
  idadeMin: number;
  idadeMax: number;
  nivelEscolarReq?: string[];
  status: StatusInstrumento | string;
  /** Referência na área (selo padrão-ouro). */
  ouro?: boolean;
  /** Caminho relativo dentro da pasta de manuais do usuário. */
  arquivo?: string;
  extras?: [string, string][];
  fonte?: string;
  gratuito?: boolean;
  risco?: boolean;
  brIndisponivel?: boolean;
  obs?: string;
};

export const DEMANDAS: { id: string; label: string }[] = [
  { id: "TDAH", label: "TDAH" },
  { id: "TEA", label: "TEA" },
  { id: "DI", label: "Déficit Intelectual" },
  { id: "DA", label: "Dific. Aprendizagem" },
  { id: "TOD", label: "TOD / Comportamento" },
  { id: "EMO", label: "Emocional / Ansiedade" },
  { id: "HUMOR", label: "Humor / Bipolar" },
  { id: "PERS", label: "Personalidade" },
  { id: "MEM", label: "Memória / Demência" },
  { id: "FE", label: "Funções Executivas" },
  { id: "Global", label: "Desenv. Global" },
];

export const NIVEIS_ESCOLARES: { id: string; label: string }[] = [
  { id: "NE", label: "Não escolarizado" },
  { id: "EI", label: "Ed. Infantil" },
  { id: "FI", label: "Fund. I (1º–5º)" },
  { id: "FII", label: "Fund. II (6º–9º)" },
  { id: "EM", label: "Ensino Médio" },
  { id: "ES", label: "Ensino Superior" },
];

export const RESPONDENTE_LABEL: Record<string, string> = {
  paciente: "Aplicado ao paciente",
  pais: "Respondido pelos pais/responsáveis",
  professor: "Respondido pelo professor",
  obs: "Observação / entrevista",
};

const buscar = (q: string) => "https://www.google.com/search?q=" + encodeURIComponent(q);
const pearson = (q: string) =>
  "https://sinopsyseditora.com.br/busca?busca=" + encodeURIComponent(q);

export const INSTRUMENTOS: Instrumento[] = [
  // ─── INTELIGÊNCIA
  { id:"wasi",   nome:"WASI",      descricao:"Escala Wechsler Abreviada de Inteligência", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TDAH","TEA","DA","FE","Global"], idadeMin:6, idadeMax:89, status:"SATEPSI", ouro:true, obs:"QI abreviado — 2 ou 4 subtestes (verbal, executivo, total)", arquivo:"Infantojuvenil/Manuais/WASI - Manual Completo.pdf", extras:[["Caderno de Instruções","Infantojuvenil/Manuais/WASI - Caderno de Instruções.pdf"],["Folha de aplicação","Infantojuvenil/Escalas e Testes/WASI - folha de aplicação.pdf"],["Livro de Estímulos (imprimir)","Infantojuvenil/Escalas e Testes/WASI - Livro de Estímulos (imprimir).pdf"]] },
  { id:"wisc4",  nome:"WISC-IV",   descricao:"Escala Wechsler de Inteligência para Crianças — 4ª ed.", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TDAH","TEA","DA","FE"], idadeMin:6, idadeMax:16, status:"SATEPSI", ouro:true, obs:"Avaliação completa — ICV, IRP, IMO, IVP (versão brasileira vigente)", fonte:"https://www.valordoconhecimento.com.br/produto/wisc-iv-escala-wechsler-de-inteligencia-para-criancas-kit-completo-84662" },
  { id:"wais4",  nome:"WAIS-III",  descricao:"Escala Wechsler de Inteligência para Adultos — 3ª ed.", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TDAH","DA","FE","MEM"], idadeMin:16, idadeMax:89, status:"SATEPSI", ouro:true, obs:"QI adulto — ICV, IOP, IMO, IVP · no SATEPSI a edição favorável é a WAIS-III (não a IV)", fonte:pearson("WAIS") },
  { id:"wppsi4", nome:"WPPSI-IV",  descricao:"Escala Wechsler Pré-Escolar — 4ª ed.", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TEA","Global"], idadeMin:2, idadeMax:8, status:"complementar", brIndisponivel:true, obs:"Pré-escolar — ⚠ sem versão brasileira (nunca traduzido/comercializado no BR) · alternativas: WPPSI-III (pesquisa), SON-R, Columbia", fonte:pearson("WPPSI") },
  { id:"leiter3", nome:"LEITER-3", descricao:"Escala de Inteligência Leiter — 3ª ed.", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TEA"], idadeMin:3, idadeMax:75, status:"complementar", obs:"Não-verbal — TEA, surdos, não verbalizantes · SATEPSI: não avaliado · sem versão comercial BR (alternativas: SON-R, BETA-III)", fonte:buscar('"Leiter-3" teste comprar Brasil') },
  { id:"cpm",    nome:"Raven CPM", descricao:"Matrizes Progressivas Coloridas de Raven", respondente:"paciente", tipo:"Inteligência", demandas:["DI","DA","Global"], idadeMin:4, idadeMax:11, status:"SATEPSI", obs:"Raciocínio fluido não-verbal — aplicação simples", fonte:pearson("Raven") },
  { id:"spm",    nome:"Raven SPM", descricao:"Matrizes Progressivas Padrão de Raven", respondente:"paciente", tipo:"Inteligência", demandas:["DI","DA","TDAH"], idadeMin:9, idadeMax:65, status:"SATEPSI", obs:"Raciocínio fluido — maior exigência que CPM", fonte:pearson("Raven") },
  { id:"columbia", nome:"Columbia (CEEI)", descricao:"Escala de Maturidade Mental Columbia", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TEA","Global"], idadeMin:3, idadeMax:10, status:"SATEPSI", obs:"Não-verbal — triagem cognitiva pré-escolar e baixo nível verbal", fonte:pearson("Columbia") },
  { id:"sonr27",  nome:"SON-R 2½-7[a]", descricao:"Teste Não-Verbal de Inteligência Snijders-Oomen", respondente:"paciente", tipo:"Inteligência", demandas:["DI","TEA","Global"], idadeMin:2.5, idadeMax:7.9, status:"SATEPSI", obs:"Não-verbal (2:6–7:11) — TEA, surdez, linguagem limitada · alternativa nacional ao Leiter", fonte:"https://www.hogrefe.com.br/catalogsearch/result/?q=SON-R" },
  { id:"beta3",   nome:"BETA-III",      descricao:"Teste Não-Verbal de Inteligência Geral", respondente:"paciente", tipo:"Inteligência", demandas:["DI","DA"], idadeMin:16, idadeMax:89, status:"SATEPSI", obs:"Não-verbal adulto — raciocínio matricial e códigos; útil em baixa escolaridade", fonte:"https://www.valordoconhecimento.com.br/produto/beta-iii-teste-nao-verbal-de-inteligencia-geral-kit-completo-86736" },

  // ─── ATENÇÃO
  { id:"bpa2", nome:"BPA-2", descricao:"Bateria Psicológica para Avaliação da Atenção — 2ª ed.", respondente:"paciente", tipo:"Atenção", demandas:["TDAH","DA","FE"], idadeMin:6, idadeMax:16, status:"SATEPSI", ouro:true, obs:"Atenção concentrada, dividida, alternada e sustentada", arquivo:"Infantojuvenil/Manuais/BPA-2 - Manual (Bateria de Atenção).pdf" },
  { id:"d2r",  nome:"d2-R",  descricao:"Teste de Atenção Concentrada d2 — Revisado", respondente:"paciente", tipo:"Atenção", demandas:["TDAH","DA","FE"], idadeMin:9, idadeMax:59, status:"SATEPSI", obs:"Atenção concentrada e velocidade de processamento", fonte:"https://hogrefe.com.br/teste-d2-revisa.html" },

  // ─── FUNÇÕES EXECUTIVAS
  { id:"fdt",   nome:"FDT",              descricao:"Five Digit Test", respondente:"paciente", tipo:"Funções Executivas", demandas:["TDAH","FE","DA"], idadeMin:7, idadeMax:89, status:"SATEPSI", obs:"Velocidade de processamento, inibição e flexibilidade", arquivo:"Infantojuvenil/Manuais/FDT - Manual.pdf", extras:[["Manual (parte 1)","Infantojuvenil/Manuais/FDT - Manual (parte 1).pdf"]] },
  { id:"banfe2", nome:"BANFE-2",         descricao:"Bateria Neuropsicológica de Funções Executivas — 2ª ed.", respondente:"paciente", tipo:"Funções Executivas", demandas:["TDAH","FE","TEA","DA"], idadeMin:6, idadeMax:80, status:"complementar", ouro:true, obs:"FE ampla — planejamento, MT, inibição, flexibilidade, fluência · sem parecer SATEPSI (não consta)", fonte:"https://www.manualmoderno.com/banfe/" },
  { id:"tol",   nome:"Torre de Londres", descricao:"Torre de Londres — Avaliação Neuropsicológica", respondente:"paciente", tipo:"Funções Executivas", demandas:["FE","TDAH","TEA"], idadeMin:7, idadeMax:80, status:"complementar", obs:"Planejamento antecipado e resolução de problemas · sem parecer SATEPSI (não consta)", arquivo:"Infantojuvenil/Escalas e Testes/Torre de Londres - Aplicação.pdf", extras:[["Manual TOL-BR (v8)","Infantojuvenil/Manuais/SAFE-TOL-BR - Manual Funções Executivas (v8).pdf"],["Folha de Aplicação (editável)","Infantojuvenil/Escalas e Testes/Torre de Londres - Folha de Aplicação.docx"]] },
  { id:"tmt",   nome:"TMT (Trilhas A/B)", descricao:"Trail Making Test", respondente:"paciente", tipo:"Funções Executivas", demandas:["FE","TDAH","DA"], idadeMin:8, idadeMax:89, status:"clinico", ouro:true, obs:"Velocidade de processamento (A) e flexibilidade cognitiva (B)", arquivo:"Infantojuvenil/Escalas e Testes/teste_trilhas_a.pdf", extras:[["Trilhas B","Infantojuvenil/Escalas e Testes/teste_trilhas_b.pdf"],["Exemplo","Infantojuvenil/Escalas e Testes/teste_trilhas_ex.pdf"]], fonte:"https://ferramentasclinicas.com/2025/06/15/trail-making-test-portugues/", gratuito:true },
  { id:"wcst",  nome:"WCST",            descricao:"Wisconsin Card Sorting Test", respondente:"paciente", tipo:"Funções Executivas", demandas:["FE","TDAH","TEA"], idadeMin:6, idadeMax:89, status:"SATEPSI", ouro:true, obs:"Flexibilidade cognitiva, abstração e perseveração", fonte:pearson("Wisconsin") },
  { id:"rey",   nome:"Figura de Rey",   descricao:"Teste da Figura Complexa de Rey", respondente:"paciente", tipo:"Funções Executivas", demandas:["FE","DA","DI","MEM"], idadeMin:6, idadeMax:89, status:"SATEPSI", ouro:true, obs:"Organização visuoespacial, planejamento e memória visual", fonte:pearson("Figuras Complexas de Rey") },
  { id:"brief2_pais", nome:"BRIEF-2 (pais)", descricao:"Behavior Rating Inventory of Executive Function — 2ª ed.", respondente:"pais", tipo:"Funções Executivas", demandas:["TDAH","FE","TEA"], idadeMin:5, idadeMax:18, status:"complementar", obs:"Índices BRI, ERI, CRI e GEC — versão pais · sem parecer SATEPSI (não consta)", fonte:buscar('"BRIEF-2" teste comprar Brasil') },
  { id:"brief2_prof", nome:"BRIEF-2 (prof)", descricao:"Behavior Rating Inventory of Executive Function — 2ª ed.", respondente:"professor", tipo:"Funções Executivas", demandas:["TDAH","FE","TEA"], idadeMin:5, idadeMax:18, status:"complementar", obs:"Versão professor · sem parecer SATEPSI (não consta)", fonte:buscar('"BRIEF-2" teste comprar Brasil') },

  // ─── TRIAGEM NEUROPSICOLÓGICA
  { id:"protea",    nome:"PROTEA-R",     descricao:"Sistema PROTEA-R de Avaliação da Suspeita de TEA — Revisado", respondente:"obs", tipo:"TEA", demandas:["TEA"], idadeMin:1.5, idadeMax:6, status:"clinico", obs:"Avaliação lúdica estruturada da suspeita de TEA em crianças pequenas (UFRGS/Bosa)", arquivo:"Infantojuvenil/Manuais/PROTEA-R - Apostila do Curso.pdf" },
  { id:"neupsilin", nome:"NEUPSILIN-Inf", descricao:"Instrumento de Avaliação Neuropsicológica Breve Infantil", respondente:"paciente", tipo:"Triagem Neuropsicológica", demandas:["Global","DA","DI","TDAH"], idadeMin:6, idadeMax:12, status:"SATEPSI", ouro:true, obs:"Triagem de linguagem, memória, atenção e habilidades escolares", fonte:"https://www.vetoreditora.com.br/produto/colecao-neupsilin-inf-instrumento-de-avaliacao-neuropsicologica-breve-infantil-70422" },

  // ─── DESENVOLVIMENTO
  { id:"bayley4",    nome:"Bayley-III",        descricao:"Escalas Bayley do Desenvolvimento do Bebê e da Criança Pequena — 3ª ed.", respondente:"paciente", tipo:"Desenvolvimento", demandas:["Global","DI","TEA"], idadeMin:0, idadeMax:3.5, status:"complementar", ouro:true, obs:"0–42 meses — cognição, linguagem, motor, socioemocional, adaptativo · no BR a versão vendida é a Bayley-III (a 4 não tem distribuição) · sem parecer SATEPSI", fonte:pearson("Bayley III") },
  { id:"denver2",    nome:"DENVER-II",         descricao:"Teste de Triagem de Desenvolvimento de Denver II", respondente:"paciente", tipo:"Desenvolvimento", demandas:["Global","DI","TEA"], idadeMin:0, idadeMax:6, status:"rastreio", obs:"Triagem do desenvolvimento (0–6a) — pessoal-social, motor, linguagem", arquivo:"Infantojuvenil/Manuais/DENVER-II - Manual Completo.pdf" },
  { id:"piagetianas", nome:"Provas Piagetianas", descricao:"Kit de Provas Piagetianas", respondente:"paciente", tipo:"Desenvolvimento", demandas:["Global","DI"], idadeMin:3, idadeMax:12, status:"desfavoravel", obs:"Pré-operatório → operatório — conservação, seriação, classificação · ⚠ SATEPSI: parecer DESFAVORÁVEL", fonte:"https://www.casadopsicopedagogo.com.br/produto/provas-operatorias-15-provas-ficha-de-madeira/" },
  { id:"idadi",  nome:"IDADI",  descricao:"Inventário Dimensional de Avaliação do Desenvolvimento Infantil", respondente:"pais", tipo:"Desenvolvimento", demandas:["Global","DI","TEA"], idadeMin:0.3, idadeMax:6, status:"complementar", ouro:true, obs:"4–72 meses — 7 domínios (cognitivo, socioemocional, linguagem, motor, adaptativo) · sem parecer SATEPSI (não consta)", fonte:"https://www.vetoreditora.com.br/produto/colecao-idadi-inventario-dimensional-de-avalicao-do-desenvolvimento-infantil-70411" },
  { id:"bender", nome:"Bender (B-SPG)", descricao:"Teste Gestáltico Visomotor de Bender — Sistema de Pontuação Gradual", respondente:"paciente", tipo:"Visuomotor", demandas:["DA","Global"], idadeMin:6, idadeMax:10, status:"SATEPSI", obs:"Integração visomotora — sensível a imaturidade percepto-motora", fonte:"https://www.vetoreditora.com.br/busca?busca=bender" },

  // ─── TEA
  { id:"cars_br",    nome:"CARS-BR",          descricao:"Escala de Avaliação do Autismo Infantil — Brasileira", respondente:"obs", tipo:"TEA", demandas:["TEA"], idadeMin:2, idadeMax:18, status:"complementar", ouro:true, obs:"Observação direta (15 domínios) + informações de cuidadores · sem parecer SATEPSI (não consta)", fonte:pearson("CARS") },
  { id:"srs2_pre_p", nome:"SRS-2 Pré (pais)", descricao:"Social Responsiveness Scale — 2ª ed. (Pré-Escolar)", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:2.5, idadeMax:4.5, status:"SATEPSI", obs:"Responsividade social — 2:6–4:6 anos, versão pais", fonte:"https://omegalivraria.com.br/produtos/srs-2-colecao-escala-de-responsividade-social-hogrefe/" },
  { id:"srs2_esc_p", nome:"SRS-2 Esc (pais)", descricao:"Social Responsiveness Scale — 2ª ed. (Escolar)", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:4, idadeMax:18, status:"SATEPSI", ouro:true, obs:"5 domínios + especificadores DSM-5 — versão pais", fonte:"https://omegalivraria.com.br/produtos/srs-2-colecao-escala-de-responsividade-social-hogrefe/" },
  { id:"srs2_esc_pr", nome:"SRS-2 Esc (prof)", descricao:"Social Responsiveness Scale — 2ª ed. (Escolar)", respondente:"professor", tipo:"TEA", demandas:["TEA"], idadeMin:4, idadeMax:18, status:"SATEPSI", obs:"Versão professor", fonte:"https://omegalivraria.com.br/produtos/srs-2-colecao-escala-de-responsividade-social-hogrefe/" },
  { id:"aq10_crianca", nome:"AQ-10 Criança",  descricao:"Autism Spectrum Quotient — 10 (Criança)", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:4, idadeMax:11, status:"rastreio", obs:"Rastreio rápido de TEA (10 itens) · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/AQ-10 - Autismo Criança.pdf" },
  { id:"aq_adol",   nome:"AQ Adolescente",    descricao:"Autism Spectrum Quotient — Adolescente", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:12, idadeMax:16, status:"rastreio", obs:"Rastreio de TEA — adolescentes · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/AQ - Autismo (Adolescente).pdf" },
  { id:"ata",       nome:"ATA",              descricao:"Escala de Avaliação de Traços Autísticos", respondente:"obs", tipo:"TEA", demandas:["TEA"], idadeMin:2, idadeMax:18, status:"rastreio", obs:"Rastreio de traços autísticos (observação/cuidadores)", arquivo:"Infantojuvenil/Escalas e Testes/ATA - Traços Autísticos.pdf" },
  { id:"cast",      nome:"CAST",             descricao:"Childhood Autism Spectrum Test", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:4, idadeMax:11, status:"rastreio", obs:"Rastreio de TEA (4–11a) · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/CAST - Rastreio de Asperger na Infância.pdf", extras:[["Chave de pontuação","Infantojuvenil/Escalas e Testes/CAST - Chave de Pontuação (Key Score).pdf"]] },
  { id:"mchat",     nome:"M-CHAT-R/F",       descricao:"Modified Checklist for Autism in Toddlers — Revised", respondente:"pais", tipo:"TEA", demandas:["TEA","Global"], idadeMin:1.3, idadeMax:2.5, status:"rastreio", obs:"Rastreio precoce de TEA (16–30 meses) — versão BR validada, com entrevista de seguimento · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/M-CHAT-R-F - Rastreio de Autismo (PT-BR).pdf", extras:[["Critérios de correção","Infantojuvenil/Escalas e Testes/M-CHAT - Critérios de Correção (para o psicólogo).pdf"]], fonte:"https://mchatscreen.com", gratuito:true },
  { id:"ados2",     nome:"ADOS-2",           descricao:"Escala de Observação para o Diagnóstico do Autismo — 2ª ed.", respondente:"obs", tipo:"TEA", demandas:["TEA"], idadeMin:1, idadeMax:99, status:"clinico", ouro:true, obs:"Padrão-ouro observacional do TEA — módulos T a 4 (12 meses ao adulto) · versão em português (PT), sem normas BR", arquivo:"Infantojuvenil/Escalas e Testes/ADOS-2 - Observação Diagnóstica de Autismo.pdf", fonte:"https://www.hogrefe.com/pt/shop/ados-2.html" },
  { id:"adir",      nome:"ADI-R",            descricao:"Autism Diagnostic Interview — Revised", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:2, idadeMax:99, status:"clinico", ouro:true, obs:"Padrão-ouro — entrevista estruturada com cuidadores · tradução validada no Brasil (UFRGS)", arquivo:"Infantojuvenil/Escalas e Testes/ADI-R - Entrevista Diagnóstica de Autismo.pdf", fonte:"https://lume.ufrgs.br/handle/10183/16449", gratuito:true },
  { id:"srs2_adulto", nome:"SRS-2 Adulto",   descricao:"Social Responsiveness Scale — 2ª ed. (Adulto, heterorrelato)", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:19, idadeMax:99, status:"SATEPSI", obs:"Traços do espectro no adulto — respondido por familiar/pessoa próxima", fonte:"https://ibneuro.com.br/products/srs-2-escala-de-responsividade-social-2%C2%AA-edicao-folhas-de-respostas-adulto-heterorrelato" },

  // ─── TDAH / COMPORTAMENTO DISRUPTIVO
  { id:"snap4_pais", nome:"SNAP-IV (pais)",  descricao:"Swanson, Nolan and Pelham Scale — IV", respondente:"pais", tipo:"TDAH", demandas:["TDAH","TOD"], idadeMin:6, idadeMax:17, status:"rastreio", obs:"26 itens DSM — desatenção, HI e TOD · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/SNAP-IV - Escala.pdf", extras:[["Versão editável (docx)","Infantojuvenil/Escalas e Testes/SNAP-IV - Crianças e Adolescentes.docx"],["Versão crianças (pdf)","Infantojuvenil/Escalas e Testes/SNAP-IV - Crianças.pdf"]] },
  { id:"snap4_prof", nome:"SNAP-IV (prof)",  descricao:"Swanson, Nolan and Pelham Scale — IV", respondente:"professor", tipo:"TDAH", demandas:["TDAH","TOD"], idadeMin:6, idadeMax:17, status:"rastreio", obs:"Versão professor · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/SNAP-IV - Escala.pdf", extras:[["Versão editável (docx)","Infantojuvenil/Escalas e Testes/SNAP-IV - Crianças e Adolescentes.docx"]] },
  { id:"conners_pais", nome:"Conners (pais)", descricao:"Escala Conners — TDAH e comportamentos associados", respondente:"pais", tipo:"TDAH", demandas:["TDAH","TOD"], idadeMin:6, idadeMax:18, status:"rastreio", obs:"Avaliação de TDAH e comportamentos associados — pais", arquivo:"Infantojuvenil/Escalas e Testes/Conners - TDAH (versão Pais).docx", extras:[["Versão alternativa (v2)","Infantojuvenil/Escalas e Testes/Conners - TDAH (versão Pais) (v2).docx"]] },
  { id:"vanderbilt_pais", nome:"Vanderbilt (pais)", descricao:"NICHQ Vanderbilt Assessment Scale", respondente:"pais", tipo:"TDAH", demandas:["TDAH","TOD"], idadeMin:6, idadeMax:12, status:"rastreio", obs:"TDAH, TOD, conduta e rastreio acadêmico · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/Vanderbilt - TDAH (Pais).pdf", extras:[["Tradução combinada (Pais+Prof)","Infantojuvenil/Escalas e Testes/Vanderbilt - TDAH (tradução).pdf"],["Versão revisada","Infantojuvenil/Escalas e Testes/Vanderbilt - TDAH (revisado).pdf"],["Tradução editável (docx)","Infantojuvenil/Escalas e Testes/Vanderbilt - TDAH (tradução).docx"]] },
  { id:"vanderbilt_prof", nome:"Vanderbilt (prof)", descricao:"NICHQ Vanderbilt Assessment Scale", respondente:"professor", tipo:"TDAH", demandas:["TDAH","TOD"], idadeMin:6, idadeMax:12, status:"rastreio", obs:"Versão professor · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/Vanderbilt - TDAH (Professores).pdf", extras:[["Tradução combinada (Pais+Prof)","Infantojuvenil/Escalas e Testes/Vanderbilt - TDAH (tradução).pdf"],["Escalas originais (inglês)","Infantojuvenil/Escalas e Testes/Vanderbilt - Escalas TDAH (original).pdf"]] },
  { id:"dbd_pais", nome:"DBD (pais)",        descricao:"Disruptive Behavior Disorders Rating Scale", respondente:"pais", tipo:"Comportamento", demandas:["TDAH","TOD"], idadeMin:5, idadeMax:18, status:"rastreio", obs:"Rastreio de TDAH, TOD e conduta (DSM) · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos.pdf", extras:[["Alternativa Pais+Prof (v2)","Infantojuvenil/Escalas e Testes/DBD - Transtornos Disruptivos (Pais e Professores) (v2).pdf"],["Versão corrigida","Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos (corrigida).pdf"],["Versão editável (docx)","Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos (editável).docx"],["Versão revisada","Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos (revisada).docx"],["Tabelas de pontuação","Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos (tabelas).docx"]] },
  { id:"dbd_prof", nome:"DBD (prof)",        descricao:"Disruptive Behavior Disorders Rating Scale", respondente:"professor", tipo:"Comportamento", demandas:["TDAH","TOD"], idadeMin:5, idadeMax:18, status:"rastreio", obs:"Versão professor · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos.pdf", extras:[["Alternativa Pais+Prof (v2)","Infantojuvenil/Escalas e Testes/DBD - Transtornos Disruptivos (Pais e Professores) (v2).pdf"],["Tabelas de pontuação","Infantojuvenil/Escalas e Testes/DBD - Comportamentos Disruptivos (tabelas).docx"]] },

  // ─── COMPORTAMENTO ADAPTATIVO
  { id:"vineland_p",  nome:"Vineland-3 (pais)", descricao:"Vineland Adaptive Behavior Scales — 3ª ed.", respondente:"pais", tipo:"Comp. Adaptativo", demandas:["DI","TEA","Global"], idadeMin:0, idadeMax:90, status:"complementar", ouro:true, obs:"Comunicação, vida diária, socialização, motor — entrevista · sem parecer SATEPSI (não consta)", arquivo:"Infantojuvenil/Manuais/Vineland-3 - Manual.pdf", extras:[["Formulário de Entrevista (Níveis de Domínio)","Infantojuvenil/Escalas e Testes/Vineland-3 - Formulário de Entrevista (Níveis de Domínio).pdf"],["Formulário Pais (níveis de domínio)","Infantojuvenil/Escalas e Testes/Vineland-3 - Formulário Pais (níveis de domínio).pdf"],["Manual — parte 1","Infantojuvenil/Manuais/Vineland-3 - parte 1.pdf"],["Manual — parte 2","Infantojuvenil/Manuais/Vineland-3 - parte 2.pdf"],["Manual — partes 3–5","Infantojuvenil/Manuais/Vineland-3 - parte 3-5.pdf"]] },
  { id:"vineland_pr", nome:"Vineland-3 (prof)", descricao:"Vineland Adaptive Behavior Scales — 3ª ed.", respondente:"professor", tipo:"Comp. Adaptativo", demandas:["DI","TEA"], idadeMin:3, idadeMax:21, status:"complementar", obs:"Questionário para professores · sem parecer SATEPSI (não consta)", arquivo:"Infantojuvenil/Manuais/Vineland-3 - Manual.pdf", extras:[["Formulário Extensivo — Professores","Infantojuvenil/Escalas e Testes/Vineland-3 - Formulário Extensivo dos Professores.pdf"]] },

  // ─── DESEMPENHO ESCOLAR
  { id:"tde2",   nome:"TDE-II",   descricao:"Teste de Desempenho Escolar — 2ª ed.", respondente:"paciente", tipo:"Desempenho Escolar", demandas:["DA","DI"], idadeMin:6, idadeMax:16, nivelEscolarReq:["FI","FII"], status:"nao_privativo", ouro:true, obs:"Leitura, escrita e aritmética — 1º ao 9º ano · SATEPSI: instrumento não privativo do psicólogo (uso liberado)", arquivo:"Infantojuvenil/Manuais/TDE - Teste de Desempenho Escolar Vol 2 (Stein).pdf", fonte:"https://www.vetoreditora.com.br/produto/colecao-tde-ii-teste-de-desempenho-escolar-1-ao-9-ano-71037" },
  { id:"prolec", nome:"PROLEC-R", descricao:"Provas de Avaliação dos Processos de Leitura — Revisado", respondente:"paciente", tipo:"Desempenho Escolar", demandas:["DA"], idadeMin:6, idadeMax:10, nivelEscolarReq:["FI"], status:"complementar", obs:"Processos de leitura — 1º ao 4º ano · sem parecer SATEPSI (não consta)", fonte:pearson("PROLEC") },

  // ─── LINGUAGEM
  { id:"confias", nome:"CONFIAS", descricao:"Consciência Fonológica: Instrumento de Avaliação Sequencial", respondente:"paciente", tipo:"Linguagem", demandas:["DA"], idadeMin:4, idadeMax:9, nivelEscolarReq:["EI","FI"], status:"complementar", obs:"Consciência fonológica em nível de sílaba e fonema · sem parecer SATEPSI (não consta)", fonte:pearson("CONFIAS") },
  { id:"abfw",   nome:"ABFW",    descricao:"Teste de Linguagem Infantil ABFW", respondente:"paciente", tipo:"Linguagem", demandas:["TEA","Global","DA"], idadeMin:2, idadeMax:7, status:"rastreio", obs:"Vocabulário, fluência/pragmática, articulação, fonologia · uso livre", fonte:"https://profono.com.br/produto/abfw-teste-de-linguagem-infantil/" },

  // ─── COMPORTAMENTO / EMOCIONAL (ASEBA e rastreios)
  { id:"cbcl_pre", nome:"CBCL 1½–5 (pais)", descricao:"Child Behavior Checklist — Pré-Escolar", respondente:"pais", tipo:"Comportamento", demandas:["TEA","Global","TOD","EMO"], idadeMin:1.5, idadeMax:5, status:"complementar", obs:"Problemas emocionais e comportamentais — pré-escolares · sem parecer SATEPSI (não consta)", arquivo:"Infantojuvenil/Escalas e Testes/CBCL - Inventário Comportamental (1 a 5 anos).pdf", fonte:"https://asebalat.org/" },
  { id:"cbcl_esc", nome:"CBCL 6–18 (pais)", descricao:"Child Behavior Checklist — Escolar", respondente:"pais", tipo:"Comportamento", demandas:["TDAH","TEA","TOD","EMO","Global"], idadeMin:6, idadeMax:18, status:"complementar", ouro:true, obs:"Síndromes, DSM-oriented, internalizantes e externalizantes · sem parecer SATEPSI (não consta)", arquivo:"Infantojuvenil/Escalas e Testes/CBCL - Inventário Comportamental (4 a 18 anos).pdf", extras:[["Versão baixada (alt)","Infantojuvenil/Escalas e Testes/CBCL - Inventário (versão baixada).pdf"]], fonte:"https://asebalat.org/" },
  { id:"trf", nome:"TRF 6–18 (prof)", descricao:"Teacher's Report Form", respondente:"professor", tipo:"Comportamento", demandas:["TDAH","TEA","TOD","EMO","Global"], idadeMin:6, idadeMax:18, status:"complementar", obs:"Versão professor do CBCL · sem parecer SATEPSI (não consta)", fonte:"https://asebalat.org/" },
  { id:"ysr", nome:"YSR (autoav.)", descricao:"Youth Self-Report", respondente:"paciente", tipo:"Comportamento", demandas:["TDAH","TOD","EMO","Global"], idadeMin:11, idadeMax:18, status:"complementar", obs:"Autoavaliação do adolescente — complementa CBCL e TRF · sem parecer SATEPSI (não consta)", fonte:"https://asebalat.org/" },
  { id:"sdq_pais", nome:"SDQ (pais)", descricao:"Questionário de Capacidades e Dificuldades", respondente:"pais", tipo:"Comportamento", demandas:["EMO","TDAH","TOD","TEA","Global"], idadeMin:4, idadeMax:17, status:"rastreio", obs:"Rastreio emocional/comportamental (5 escalas) · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/SDQ - Capacidades e Dificuldades (4-17 completo).pdf", fonte:"https://www.sdqinfo.org", extras:[["Pontuação (scoring)","Infantojuvenil/Escalas e Testes/SDQ - Pontuação (scoring).pdf"],["Versão resumida","Infantojuvenil/Escalas e Testes/SDQ - Capacidades e Dificuldades (4-17).pdf"],["Alternativa Pais+Prof (v2)","Infantojuvenil/Escalas e Testes/SDQ - Capacidades e Dificuldades (Pais e Professores) (v2).pdf"]] },
  { id:"sdq_prof", nome:"SDQ (prof)", descricao:"Questionário de Capacidades e Dificuldades", respondente:"professor", tipo:"Comportamento", demandas:["EMO","TDAH","TOD","TEA","Global"], idadeMin:4, idadeMax:17, status:"rastreio", obs:"Versão professor · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/SDQ - Capacidades e Dificuldades (4-17 completo).pdf", fonte:"https://www.sdqinfo.org", extras:[["Pontuação (scoring)","Infantojuvenil/Escalas e Testes/SDQ - Pontuação (scoring).pdf"],["Alternativa Pais+Prof (v2)","Infantojuvenil/Escalas e Testes/SDQ - Capacidades e Dificuldades (Pais e Professores) (v2).pdf"]] },
  { id:"psc_pais", nome:"PSC (pais)", descricao:"Pediatric Symptom Checklist", respondente:"pais", tipo:"Comportamento", demandas:["EMO","Global","TDAH","TOD"], idadeMin:4, idadeMax:16, status:"rastreio", obs:"Rastreio psicossocial amplo · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/PSC - Checklist Sintomas Pediátricos.pdf" },
  { id:"psc_y", nome:"PSC-Y (autoav.)", descricao:"Pediatric Symptom Checklist — Youth", respondente:"paciente", tipo:"Comportamento", demandas:["EMO","Global"], idadeMin:11, idadeMax:18, status:"rastreio", obs:"Autoavaliação psicossocial · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/PSC-Y - Checklist Sintomas (Jovem).pdf" },

  // ─── EMOCIONAL (ansiedade/depressão e risco)
  { id:"rcads25", nome:"RCADS-25 (autoav.)", descricao:"Revised Children's Anxiety and Depression Scale — 25", respondente:"paciente", tipo:"Emocional", demandas:["EMO"], idadeMin:8, idadeMax:18, status:"rastreio", obs:"Rastreio de ansiedade e depressão · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/RCADS-25 - Ansiedade e Depressão (Jovem).pdf" },
  { id:"cssrs", nome:"C-SSRS", descricao:"Columbia — Escala de Gravidade do Risco de Suicídio", respondente:"obs", tipo:"Emocional", demandas:["EMO","HUMOR"], idadeMin:6, idadeMax:99, status:"rastreio", risco:true, obs:"⚠ Avaliação de risco de suicídio (crianças a idosos) — aplicar com indicadores · uso livre", arquivo:"Infantojuvenil/Escalas e Testes/C-SSRS - Risco de Suicídio.docx" },

  // ─── PROJETIVOS
  { id:"htp",     nome:"HTP",     descricao:"Casa-Árvore-Pessoa (House-Tree-Person)", respondente:"paciente", tipo:"Projetivo", demandas:["EMO","PERS","Global"], idadeMin:5, idadeMax:99, status:"rastreio", obs:"Técnica projetiva gráfica — aspectos emocionais e de personalidade (infantojuvenil e adulto)", arquivo:"Infantojuvenil/Manuais/HTP - Manual Completo.pdf", extras:[["Material de aplicação","Infantojuvenil/Escalas e Testes/HTP - Casa Árvore Pessoa.pdf"]] },
  { id:"pfister", nome:"Pfister", descricao:"Teste das Pirâmides Coloridas de Pfister", respondente:"paciente", tipo:"Projetivo", demandas:["EMO","PERS","Global"], idadeMin:6, idadeMax:70, status:"SATEPSI", obs:"Técnica projetiva — afetividade e dinâmica emocional (versões infantojuvenil e adulto)", arquivo:"Infantojuvenil/Escalas e Testes/Pfister - Pirâmides Coloridas.docx" },

  // ─── MEMÓRIA
  { id:"ravlt", nome:"RAVLT", descricao:"Teste de Aprendizagem Auditivo-Verbal de Rey", respondente:"paciente", tipo:"Memória", demandas:["MEM","DA","Global"], idadeMin:6, idadeMax:92, status:"SATEPSI", ouro:true, obs:"Memória episódica verbal — codificação, evocação e reconhecimento · normas BR 6–92a", fonte:"https://www.vetoreditora.com.br/produto/colecao-ravlt-teste-de-aprendizagem-auditivo-verbal-de-rey-70429" },

  // ─── TRIAGEM COGNITIVA (ADULTO/IDOSO)
  { id:"meem", nome:"MEEM", descricao:"Mini-Exame do Estado Mental", respondente:"paciente", tipo:"Triagem Cognitiva", demandas:["MEM","Global"], idadeMin:18, idadeMax:110, status:"rastreio", obs:"Triagem cognitiva global — rastreio de demência · pontos de corte por escolaridade (Brucki)", arquivo:"Adulto/Escalas e Testes/MEEM - Mini-Exame do Estado Mental.pdf", fonte:"https://saude.rs.gov.br/upload/arquivos/202101/29102908-mini-exame-do-estado-mental-meem.pdf", gratuito:true },
  { id:"moca", nome:"MoCA", descricao:"Montreal Cognitive Assessment", respondente:"paciente", tipo:"Triagem Cognitiva", demandas:["MEM","FE"], idadeMin:18, idadeMax:110, status:"rastreio", obs:"Triagem de comprometimento cognitivo leve — mais sensível que o MEEM · versão PT-BR oficial · exige treinamento/certificação obrigatórios (mocacognition.com)", fonte:"https://mocacognition.com" },
  { id:"tdr",  nome:"Teste do Relógio", descricao:"Clock Drawing Test (TDR)", respondente:"paciente", tipo:"Triagem Cognitiva", demandas:["MEM"], idadeMin:50, idadeMax:110, status:"rastreio", obs:"Desenho do relógio à mão livre (sem formulário) — rastreio de demência, pontuação de Shulman (0–5) · usar em conjunto com MEEM/MoCA", fonte:"https://linhasdecuidado.saude.gov.br/portal/demencia/atencao-especializada/rastreamento/" },

  // ─── TDAH ADULTO
  { id:"asrs", nome:"ASRS-18", descricao:"Adult ADHD Self-Report Scale (OMS)", respondente:"paciente", tipo:"TDAH", demandas:["TDAH"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Rastreio de TDAH no adulto (DSM) — triagem de 6 itens + 12 complementares · uso livre", arquivo:"Adulto/Escalas e Testes/ASRS-6Q - TDAH Adulto.pdf" },

  // ─── HUMOR / BIPOLAR
  { id:"bdi2",  nome:"BDI-II", descricao:"Inventário de Depressão de Beck — 2ª ed.", respondente:"paciente", tipo:"Humor", demandas:["HUMOR","EMO"], idadeMin:13, idadeMax:80, status:"SATEPSI", ouro:true, obs:"Referência em sintomas depressivos — 21 itens (13–80a)", arquivo:"Adulto/Escalas e Testes/BDI-II - Inventario de Depressao de Beck (com pontos de corte).pdf", fonte:pearson("Beck") },
  { id:"phq9",  nome:"PHQ-9",  descricao:"Patient Health Questionnaire — 9", respondente:"paciente", tipo:"Humor", demandas:["HUMOR","EMO"], idadeMin:18, idadeMax:110, status:"rastreio", obs:"Rastreio e monitoramento de depressão (critérios DSM) · uso livre", arquivo:"Adulto/Escalas e Testes/PHQ-9 - Depressão.pdf", extras:[["Instruções PHQ/GAD-7","Adulto/Manuais/PHQ e GAD-7 - Instruções.pdf"]] },
  { id:"mdq",   nome:"MDQ",    descricao:"Questionário de Transtorno de Humor", respondente:"paciente", tipo:"Humor", demandas:["HUMOR"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Rastreio de espectro bipolar — corte ≥7 sintomas · validação brasileira (Castelo et al.)", fonte:"https://www.scielo.br/j/rbp/a/JBbkjB85qbQ9HpwwwT7kfYz/", gratuito:true },
  { id:"hcl32", nome:"HCL-32 VB", descricao:"Hypomania Checklist — 32 (versão brasileira)", respondente:"paciente", tipo:"Humor", demandas:["HUMOR"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Rastreio de hipomania — diferencia depressão unipolar × espectro bipolar · uso livre", fonte:"https://bibliotecadeinstrumentos.com.br/instrumentos/questionario-de-autoavaliacao-de-hipomania-versao-brasileira-hcl-32-vb__e97f33f2-f77f-4b5b-a6d7-9343f1841bb2", gratuito:true },
  { id:"ymrs",  nome:"YMRS",   descricao:"Escala de Avaliação de Mania de Young", respondente:"obs", tipo:"Humor", demandas:["HUMOR"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Gravidade de sintomas maníacos — heteroaplicada pelo clínico (11 itens)", fonte:"https://transtornobipolar.net/escala/escala-de-mania-de-young-ymrs/", gratuito:true },

  // ─── ANSIEDADE
  { id:"bai",  nome:"BAI",   descricao:"Inventário de Ansiedade de Beck", respondente:"paciente", tipo:"Emocional", demandas:["EMO"], idadeMin:17, idadeMax:80, status:"SATEPSI", obs:"Intensidade de sintomas ansiosos — 21 itens", fonte:pearson("Beck") },
  { id:"gad7", nome:"GAD-7", descricao:"Generalized Anxiety Disorder — 7", respondente:"paciente", tipo:"Emocional", demandas:["EMO"], idadeMin:18, idadeMax:110, status:"rastreio", obs:"Rastreio de ansiedade generalizada · uso livre", arquivo:"Adulto/Escalas e Testes/GAD-7 - Ansiedade.pdf", extras:[["Instruções PHQ/GAD-7","Adulto/Manuais/PHQ e GAD-7 - Instruções.pdf"]] },
  { id:"pcl5", nome:"PCL-5", descricao:"Posttraumatic Stress Disorder Checklist — DSM-5", respondente:"paciente", tipo:"Emocional", demandas:["EMO"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Rastreio de TEPT (DSM-5) — 20 itens · corte ≥36 na versão BR · uso livre", fonte:"https://bibliotecadeinstrumentos.com.br/instrumentos/posttraumatic-stress-disorder-checklist-5-pcl-5__3726ee90-cc0e-47c6-9bd1-f36aa00de628", gratuito:true },

  // ─── PERSONALIDADE
  { id:"neoffir", nome:"NEO-FFI-R", descricao:"Inventário dos Cinco Grandes Fatores de Personalidade — revisado", respondente:"paciente", tipo:"Personalidade", demandas:["PERS"], idadeMin:17, idadeMax:99, status:"SATEPSI", obs:"Big Five — neuroticismo, extroversão, abertura, amabilidade, conscienciosidade", arquivo:"Adulto/Escalas e Testes/NEO-FFI-R.pdf", extras:[["Versão editável (docx)","Adulto/Escalas e Testes/NEO-FFI - Personalidade.docx"]] },
  { id:"pid5",    nome:"PID-5",     descricao:"Inventário de Personalidade para o DSM-5", respondente:"paciente", tipo:"Personalidade", demandas:["PERS"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Traços patológicos (Critério B, modelo alternativo do DSM-5) — 25 facetas · versão BR oficial gratuita", fonte:"https://bibliotecadeinstrumentos.com.br/inventario-de-personalidade-para-o-dsm-5-adulto-pid-5__4d5ef9e5-dd61-4a51-be2b-9ed308c08844", gratuito:true },
  { id:"bfp",      nome:"BFP",      descricao:"Bateria Fatorial de Personalidade", respondente:"paciente", tipo:"Personalidade", demandas:["PERS"], idadeMin:18, idadeMax:90, status:"SATEPSI", obs:"Big Five com normas brasileiras — 126 itens, facetas por fator", fonte:pearson("Bateria Fatorial de Personalidade") },
  { id:"zulliger", nome:"Zulliger (ZSC)", descricao:"Teste de Zulliger — Sistema Compreensivo", respondente:"paciente", tipo:"Projetivo", demandas:["PERS","EMO"], idadeMin:18, idadeMax:90, status:"SATEPSI", obs:"Técnica projetiva de manchas — funcionamento da personalidade (forma breve do método de Rorschach)", fonte:pearson("Zulliger") },

  // ─── ENTREVISTA DIAGNÓSTICA
  { id:"scid5", nome:"SCID-5-CV", descricao:"Entrevista Clínica Estruturada para os Transtornos do DSM-5", respondente:"obs", tipo:"Entrevista Diagnóstica", demandas:["PERS","HUMOR","EMO"], idadeMin:18, idadeMax:90, status:"clinico", ouro:true, obs:"Referência diagnóstica — humor, psicose, ansiedade, TOC, TEPT (TPs exigem a SCID-5-PD, módulo separado)", arquivo:"Adulto/Escalas e Testes/SCID-5 - Entrevista Clínica (DSM-5).pdf" },
  { id:"scid5pd", nome:"SCID-5-PD", descricao:"Entrevista Clínica Estruturada para os Transtornos da Personalidade do DSM-5", respondente:"obs", tipo:"Entrevista Diagnóstica", demandas:["PERS"], idadeMin:18, idadeMax:90, status:"clinico", ouro:true, obs:"Diagnóstico categórico dos transtornos da personalidade — complementa a SCID-5-CV (ed. Artmed)", fonte:buscar('"SCID-5-PD" Artmed comprar') },

  // ─── NOVOS (jun/2026) — idade/demanda preenchidas como padrão, ⚠ REVISAR
  { id:"bdefs_ca", nome:"BDEFS-CA", descricao:"Barkley — Déficits de Funções Executivas (Criança/Adolescente)", respondente:"pais", tipo:"Funções Executivas", demandas:["TDAH","FE"], idadeMin:6, idadeMax:17, status:"complementar", obs:"FE no cotidiano (heterorrelato)", arquivo:"Infantojuvenil/Escalas e Testes/BDEFS-CA - Déficits de Funções Executivas (Criança-Adolescente).pdf" },
  { id:"brown", nome:"Escala Brown", descricao:"Brown — Escala de TDAH e Funções Executivas", respondente:"pais", tipo:"TDAH", demandas:["TDAH","FE"], idadeMin:3, idadeMax:18, status:"complementar", obs:"TDAH + FE", arquivo:"Infantojuvenil/Escalas e Testes/Escala Brown - TDAH.pdf" },
  { id:"etdah", nome:"ETDAH", descricao:"Escala de Avaliação de TDAH", respondente:"pais", tipo:"TDAH", demandas:["TDAH"], idadeMin:6, idadeMax:17, status:"complementar", obs:"TDAH crianças e adolescentes", arquivo:"Infantojuvenil/Escalas e Testes/ETDAH - Escala de TDAH.pdf", extras:[["Crianças e Adolescentes","Infantojuvenil/Escalas e Testes/ETDAH - Crianças e Adolescentes.pdf"]] },
  { id:"hsq", nome:"HSQ", descricao:"Questionário de Situações em Casa (Barkley)", respondente:"pais", tipo:"Comportamento", demandas:["TDAH","TOD"], idadeMin:4, idadeMax:18, status:"rastreio", obs:"Situações-problema em casa", arquivo:"Infantojuvenil/Escalas e Testes/HSQ - Questionário de Situações em Casa (TDAH).pdf" },
  { id:"ssq", nome:"SSQ", descricao:"Questionário de Situações na Escola (Barkley)", respondente:"professor", tipo:"Comportamento", demandas:["TDAH","TOD"], idadeMin:4, idadeMax:18, status:"rastreio", obs:"Situações-problema na escola", arquivo:"Infantojuvenil/Escalas e Testes/SSQ - Questionário de Situações na Escola (TDAH).pdf" },
  { id:"asq3", nome:"ASQ-3", descricao:"Ages & Stages Questionnaires — 3ª ed.", respondente:"pais", tipo:"Desenvolvimento", demandas:["Global","DI","TEA"], idadeMin:0.1, idadeMax:5.5, status:"rastreio", obs:"Triagem do desenvolvimento (arquivo: 36 meses)", arquivo:"Infantojuvenil/Escalas e Testes/ASQ-3 - Rastreio de Idades e Estágios (36 meses).pdf" },
  { id:"assq", nome:"ASSQ", descricao:"Autism Spectrum Screening Questionnaire", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:6, idadeMax:17, status:"rastreio", obs:"Rastreio de TEA (alto funcionamento/Asperger)", arquivo:"Infantojuvenil/Escalas e Testes/ASSQ - Triagem do Espectro Autista.pdf" },
  { id:"bapq", nome:"BAPQ", descricao:"Broad Autism Phenotype Questionnaire", respondente:"pais", tipo:"TEA", demandas:["TEA"], idadeMin:18, idadeMax:99, status:"rastreio", obs:"Fenótipo ampliado do autismo (adultos/pais)", arquivo:"Adulto/Escalas e Testes/BAPQ - Fenótipo Ampliado do Autismo (pais-adultos).pdf" },
  { id:"abc_tea", nome:"ABC", descricao:"Autism Behavior Checklist (Inventário de Comportamentos Autísticos)", respondente:"obs", tipo:"TEA", demandas:["TEA"], idadeMin:1.5, idadeMax:18, status:"rastreio", obs:"Inventário de comportamentos autísticos", arquivo:"Infantojuvenil/Escalas e Testes/ABC - Escala (Autism Behavior Checklist) (v3).pdf" },
  { id:"dcdq", nome:"DCDQ", descricao:"Developmental Coordination Disorder Questionnaire", respondente:"pais", tipo:"Desenvolvimento", demandas:["Global"], idadeMin:5, idadeMax:15, status:"rastreio", obs:"Rastreio de transtorno do desenvolvimento da coordenação", arquivo:"Infantojuvenil/Escalas e Testes/DCDQ - Questionário de Transtorno de Coordenação.pdf" },
  { id:"edm", nome:"EDM", descricao:"Escala de Desenvolvimento Motor (Rosa Neto)", respondente:"paciente", tipo:"Desenvolvimento", demandas:["Global","DI"], idadeMin:2, idadeMax:11, status:"complementar", obs:"Avaliação motora (motricidade fina/global, equilíbrio)", arquivo:"Infantojuvenil/Manuais/EDM - Manual de Avaliação Motora (Rosa Neto).pdf" },
  { id:"bis11", nome:"BIS-11", descricao:"Escala de Impulsividade de Barratt", respondente:"paciente", tipo:"Personalidade", demandas:["PERS","TDAH"], idadeMin:14, idadeMax:99, status:"rastreio", obs:"Impulsividade (atencional, motora, não-planejamento)", arquivo:"Infantojuvenil/Escalas e Testes/BIS-11 - Escala de Impulsividade de Barratt.pdf", extras:[["Crivo de correção","Infantojuvenil/Escalas e Testes/BIS-11 - Barratt (crivo de correção).pdf"]] },
  { id:"bigfive", nome:"Big Five (IPIP)", descricao:"Inventário dos Cinco Grandes Fatores — itens IPIP (44)", respondente:"paciente", tipo:"Personalidade", demandas:["PERS"], idadeMin:16, idadeMax:99, status:"rastreio", obs:"Personalidade — itens de domínio público (IPIP) · uso livre", arquivo:"Adulto/Escalas e Testes/Big Five (IPIP) - Personalidade (44 itens).docx", gratuito:true, fonte:"https://ipip.ori.org/" },
  { id:"esa", nome:"ESA", descricao:"Escala de Stress para Adolescentes", respondente:"paciente", tipo:"Emocional", demandas:["EMO"], idadeMin:14, idadeMax:18, status:"complementar", obs:"Estresse no adolescente", arquivo:"Infantojuvenil/Escalas e Testes/ESA - Escala de Stress para Adolescentes.pdf", fonte:buscar('"ESA" escala de stress para adolescentes comprar') },
  { id:"epqj", nome:"EPQ-J", descricao:"Questionário de Personalidade de Eysenck — Junior", respondente:"paciente", tipo:"Personalidade", demandas:["PERS"], idadeMin:7, idadeMax:15, status:"complementar", obs:"Personalidade infantojuvenil (Eysenck)", arquivo:"Infantojuvenil/Escalas e Testes/EPQ-J - Questionario de Personalidade (Eysenck Jr).pdf", extras:[["Versão Crianças e Adolescentes","Infantojuvenil/Escalas e Testes/EPQ-J - Questionario de Personalidade (Criancas e Adolescentes).pdf"]], fonte:buscar('"EPQ-J" Eysenck questionário personalidade comprar') },
];
/** Filtra instrumentos por idade, demandas e nível escolar. */
export function filtrarInstrumentos(opts: {
  idade?: number | null;
  demandas?: string[];
  nivel?: string;
}): Instrumento[] {
  const { idade, demandas = [], nivel } = opts;
  return INSTRUMENTOS.filter((i) => {
    if (idade != null && (idade < i.idadeMin || idade > i.idadeMax)) return false;
    if (demandas.length > 0 && !demandas.some((d) => i.demandas.includes(d))) return false;
    if (nivel && i.nivelEscolarReq && !i.nivelEscolarReq.includes(nivel)) return false;
    return true;
  }).sort((a, b) => {
    // padrão-ouro primeiro, depois SATEPSI, depois alfabético
    if (!!b.ouro !== !!a.ouro) return b.ouro ? 1 : -1;
    const sa = a.status === "SATEPSI" ? 0 : 1;
    const sb = b.status === "SATEPSI" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/** Agrupa por respondente, como no bateria-neuro. */
export function agruparPorRespondente(lista: Instrumento[]): Record<string, Instrumento[]> {
  const out: Record<string, Instrumento[]> = {};
  for (const i of lista) {
    (out[i.respondente] ??= []).push(i);
  }
  return out;
}

/** URL local do manual, a partir da pasta configurada pelo usuário. */
export function urlManual(base: string, rel?: string): string | null {
  if (!base || !rel) return null;
  const limpo = base.replace(/[\\/]+$/, "").split("\\").join("/");
  return encodeURI(`file:///${limpo}/${rel}`);
}
