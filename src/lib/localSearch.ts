function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Busca local acento-insensivel. */
export function matchesLocal(haystack: string, needle: string): boolean {
  return norm(haystack).includes(norm(needle.trim()));
}
