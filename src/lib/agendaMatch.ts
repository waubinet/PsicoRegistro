/**
 * Correspondência entre os nomes da agenda importada e os cadastros existentes.
 * Nunca vincula por semelhança silenciosamente: só correspondência exata é
 * automática; o resto exige confirmação explícita do profissional.
 */
import type { Entity } from "./api";
import type { LinhaAgenda } from "./agendaImport";

export type Classificacao = "segura" | "possivel" | "nao_encontrado";

export type Correspondencia = {
  linha: LinhaAgenda;
  classificacao: Classificacao;
  /** Candidatos (o primeiro é o mais provável). */
  candidatos: { id: string; nome: string; detalhe: string; kind: "student" | "patient" }[];
  /** Escolha do usuário: id do cadastro ou "" para não vincular. */
  escolhido: string;
  /** Marcado como "não é a mesma pessoa". */
  recusado?: boolean;
};

/** Normaliza para comparação: sem acento, sem pontuação, caixa baixa. */
export function normalizarNome(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(nome: string): string[] {
  return normalizarNome(nome).split(" ").filter((t) => t.length > 1);
}

/**
 * Sugestão (nunca vínculo automático): o nome importado é compatível com o
 * cadastrado quando todos os seus tokens aparecem no outro — cobre casos como
 * "João Gabriel" ↔ "João Gabriel da Silva". Exige ao menos 2 tokens em comum
 * para não sugerir por um primeiro nome isolado.
 */
function compativel(importado: string, cadastrado: string): boolean {
  const a = tokens(importado);
  const b = tokens(cadastrado);
  if (a.length === 0 || b.length === 0) return false;
  const menor = a.length <= b.length ? a : b;
  const maior = a.length <= b.length ? b : a;
  const contidos = menor.filter((t) => maior.includes(t)).length;
  return contidos === menor.length && contidos >= 2;
}

export function classificar(
  linhas: LinhaAgenda[],
  estudantes: Entity[],
  pacientes: Entity[],
  nomeEscola: Map<string, string>,
): Correspondencia[] {
  type Cand = { id: string; nome: string; detalhe: string; kind: "student" | "patient" };
  const idxExato = new Map<string, Cand[]>();
  const todos: Cand[] = [];

  const registrar = (e: Entity, kind: "student" | "patient", detalhe: string) => {
    const nome = String(e.full_name ?? "");
    if (!nome) return;
    const item: Cand = { id: e.id, nome, detalhe, kind };
    todos.push(item);
    const k = normalizarNome(nome);
    if (!idxExato.has(k)) idxExato.set(k, []);
    idxExato.get(k)!.push(item);
  };

  for (const s of estudantes) {
    const det = [String(s.grade ?? ""), nomeEscola.get(String(s.school_id)) ?? ""]
      .filter(Boolean)
      .join(" · ");
    registrar(s, "student", det);
  }
  for (const p of pacientes) registrar(p, "patient", "Paciente");

  return linhas.map((linha) => {
    const alvo = normalizarNome(linha.nome);
    const exatos = idxExato.get(alvo) ?? [];
    if (exatos.length === 1) {
      return { linha, classificacao: "segura", candidatos: exatos, escolhido: exatos[0].id };
    }
    if (exatos.length > 1) {
      // homônimos: exige escolha
      return { linha, classificacao: "possivel", candidatos: exatos, escolhido: "" };
    }
    const sugestoes = todos.filter((c) => compativel(linha.nome, c.nome));
    if (sugestoes.length > 0) {
      return { linha, classificacao: "possivel", candidatos: sugestoes.slice(0, 5), escolhido: "" };
    }
    return { linha, classificacao: "nao_encontrado", candidatos: [], escolhido: "" };
  });
}

/** Duplicado = mesma pessoa, data e horário já existentes na agenda. */
export function ehDuplicado(
  existentes: { event_date?: string; start_at?: string; student_id?: string; patient_id?: string; title?: string }[],
  data: string,
  horario: string,
  pessoaId: string,
  nome: string,
): boolean {
  return existentes.some(
    (e) =>
      String(e.event_date ?? "") === data &&
      String(e.start_at ?? "") === horario &&
      (pessoaId
        ? e.student_id === pessoaId || e.patient_id === pessoaId
        : normalizarNome(String(e.title ?? "")) === normalizarNome(nome)),
  );
}

export function resumoClassificacao(cs: Correspondencia[]) {
  return {
    total: cs.length,
    seguras: cs.filter((c) => c.classificacao === "segura").length,
    possiveis: cs.filter((c) => c.classificacao === "possivel").length,
    naoEncontrados: cs.filter((c) => c.classificacao === "nao_encontrado").length,
  };
}
