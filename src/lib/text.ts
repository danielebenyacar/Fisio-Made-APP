/** Lowercase, no accents, trimmed: "Nicolò " → "nicolo". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** Collapses inner whitespace: "  Maria   Grazia " → "Maria Grazia". */
export function collapseSpaces(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** Fixes names typed all upper or lower case: "DE LUCA" → "De Luca", "d'angelo" → "D'Angelo". */
export function tidyName(text: string): string {
  const name = collapseSpaces(text)
  if (name !== name.toUpperCase() && name !== name.toLowerCase()) return name
  return name
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
