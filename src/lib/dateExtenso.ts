/** Datas por extenso em pt-BR, para documentos oficiais. */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-06-11" → "11 de junho de 2026" */
export function dataPorExtenso(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  const dia = Number(m[3]);
  const mes = MESES[Number(m[2]) - 1] ?? "";
  return `${dia} de ${mes} de ${m[1]}`;
}

export const PERIODOS = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
  { value: "integral", label: "Integral" },
];

/**
 * Frase de abertura padrão da ocorrência, no formato usado nos documentos:
 * "No dia 11 de junho de 2026, no período matutino, foi realizada visita
 *  técnica à Escola X."
 */
export function aberturaOcorrencia(dateISO: string, periodo: string, escola: string): string {
  const data = dataPorExtenso(dateISO);
  const per = periodo ? `, no período ${periodo},` : ",";
  return `No dia ${data}${per} foi realizada visita técnica à ${escola}.`;
}
