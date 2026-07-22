export type ParsedStudent = { full_name: string; gender?: string; birth_date?: string };

const DATE_RE = /(\d{2})[/-](\d{2})[/-](\d{4})/;

/** Converte dd/mm/aaaa (ou dd-mm-aaaa) para ISO; "" se não casar. */
export function toISO(s: string): string {
  const m = DATE_RE.exec(s);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Interpreta a lista colada: nome + (opcional) sexo F/M e data de nascimento. */
export function parseStudentLines(text: string): ParsedStudent[] {
  const out: ParsedStudent[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(/\t|;|\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (cols.length && /^\d+[.)]?$/.test(cols[0])) cols.shift(); // numeração em coluna própria
    else if (cols.length) cols[0] = cols[0].replace(/^\d+[.)]\s*/, ""); // numeração colada ao nome
    if (cols.length === 0 || cols[0] === "") continue;
    let gender: string | undefined;
    let birth_date: string | undefined;
    const nameParts: string[] = [];
    for (const c of cols) {
      if (/^(f|m|feminino|masculino)$/i.test(c)) {
        gender = /^f/i.test(c) ? "Feminino" : "Masculino";
      } else if (DATE_RE.test(c)) {
        birth_date = toISO(c);
      } else {
        nameParts.push(c);
      }
    }
    const full_name = nameParts.join(" ").replace(/\s+/g, " ").trim();
    if (full_name) out.push({ full_name, gender, birth_date });
  }
  return out;
}
