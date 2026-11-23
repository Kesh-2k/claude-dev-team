const TRANSLITERATIONS = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', đ: 'd', ł: 'l', þ: 'th', ð: 'd' };

/**
 * Convert text into a URL-safe slug containing only `[a-z0-9-]`.
 * Latin diacritics are removed (e.g. "Ação" -> "acao") and a few letters
 * NFD does not decompose are transliterated (e.g. "ß" -> "ss").
 *
 * Limitation: non-Latin scripts (e.g. CJK, Cyrillic, Arabic) are stripped,
 * so such input may yield an empty string.
 *
 * @param {string} text
 * @returns {string}
 * @throws {TypeError} If `text` is not a string.
 */
export function slugify(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`slugify expected a string, got ${text === null ? 'null' : typeof text}`);
  }
  return text
    .toLowerCase()
    .replace(/[ßæœøđłþð]/g, (ch) => TRANSLITERATIONS[ch])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
