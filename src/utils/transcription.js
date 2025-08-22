/* 
AUTHOR: Kenneth Agonoy 
LOCATION: .../src/utils/transcription.js
LAST EDITED: 2025-08-22

PURPOSE:
- Features functions to convert Tagalog text to Baybayin script and vice versa. 
- Supports two Baybayin styles: Krus-Kudlit (with virama) and Pamudpod (with Pamudpod).
*/

/* ================ BAYBAYIN MAPPINGS ================ */
const VOWEL_A = 'ᜀ';
const VOWEL_I = 'ᜁ';
const VOWEL_U = 'ᜂ';
const KUDLIT  = '᜔'; 
const PAMUDPOD = '᜕';
const TOP_ACCENT = 'ᜒ';  // i/e
const BOTTOM_ACCENT = 'ᜓ';  // o/u
const PUNCT = { '.': ' //', ',': ' /' };

const mapBybn = {
  a: VOWEL_A, e: VOWEL_I, i: VOWEL_I, o: VOWEL_U, u: VOWEL_U,

  ba: 'ᜊ', ka: 'ᜃ', da: 'ᜇ', ga: 'ᜄ', ha: 'ᜑ',
  la: 'ᜎ', ma: 'ᜋ', na: 'ᜈ', pa: 'ᜉ', ra: 'ᜍ',
  sa: 'ᜐ', ta: 'ᜆ', wa: 'ᜏ', ya: 'ᜌ', nga: 'ᜅ',

  b: 'ᜊ' + KUDLIT, k: 'ᜃ' + KUDLIT, d: 'ᜇ' + KUDLIT, g: 'ᜄ' + KUDLIT, h: 'ᜑ' + KUDLIT,
  l: 'ᜎ' + KUDLIT, m: 'ᜋ' + KUDLIT, n: 'ᜈ' + KUDLIT, p: 'ᜉ' + KUDLIT, r: 'ᜍ' + KUDLIT,
  s: 'ᜐ' + KUDLIT, t: 'ᜆ' + KUDLIT, w: 'ᜏ' + KUDLIT, y: 'ᜌ' + KUDLIT, ng: 'ᜅ' + KUDLIT,

  bi: 'ᜊ' + TOP_ACCENT, be: 'ᜊ' + TOP_ACCENT,
  ki: 'ᜃ' + TOP_ACCENT, ke: 'ᜃ' + TOP_ACCENT,
  di: 'ᜇ' + TOP_ACCENT, de: 'ᜇ' + TOP_ACCENT,
  gi: 'ᜄ' + TOP_ACCENT, ge: 'ᜄ' + TOP_ACCENT,
  hi: 'ᜑ' + TOP_ACCENT, he: 'ᜑ' + TOP_ACCENT,
  li: 'ᜎ' + TOP_ACCENT, le: 'ᜎ' + TOP_ACCENT,
  mi: 'ᜋ' + TOP_ACCENT, me: 'ᜋ' + TOP_ACCENT,
  ni: 'ᜈ' + TOP_ACCENT, ne: 'ᜈ' + TOP_ACCENT,
  pi: 'ᜉ' + TOP_ACCENT, pe: 'ᜉ' + TOP_ACCENT,
  ri: 'ᜍ' + TOP_ACCENT, re: 'ᜍ' + TOP_ACCENT,
  si: 'ᜐ' + TOP_ACCENT, se: 'ᜐ' + TOP_ACCENT,
  ti: 'ᜆ' + TOP_ACCENT, te: 'ᜆ' + TOP_ACCENT,
  wi: 'ᜏ' + TOP_ACCENT, we: 'ᜏ' + TOP_ACCENT,
  yi: 'ᜌ' + TOP_ACCENT, ye: 'ᜌ' + TOP_ACCENT,
  ngi: 'ᜅ' + TOP_ACCENT, nge: 'ᜅ' + TOP_ACCENT,

  bo: 'ᜊ' + BOTTOM_ACCENT, bu: 'ᜊ' + BOTTOM_ACCENT,
  ko: 'ᜃ' + BOTTOM_ACCENT, ku: 'ᜃ' + BOTTOM_ACCENT,
  do: 'ᜇ' + BOTTOM_ACCENT, du: 'ᜇ' + BOTTOM_ACCENT,
  go: 'ᜄ' + BOTTOM_ACCENT, gu: 'ᜄ' + BOTTOM_ACCENT,
  ho: 'ᜑ' + BOTTOM_ACCENT, hu: 'ᜑ' + BOTTOM_ACCENT,
  lo: 'ᜎ' + BOTTOM_ACCENT, lu: 'ᜎ' + BOTTOM_ACCENT,
  mo: 'ᜋ' + BOTTOM_ACCENT, mu: 'ᜋ' + BOTTOM_ACCENT,
  no: 'ᜈ' + BOTTOM_ACCENT, nu: 'ᜈ' + BOTTOM_ACCENT,
  po: 'ᜉ' + BOTTOM_ACCENT, pu: 'ᜉ' + BOTTOM_ACCENT,
  ro: 'ᜍ' + BOTTOM_ACCENT, ru: 'ᜍ' + BOTTOM_ACCENT,
  so: 'ᜐ' + BOTTOM_ACCENT, su: 'ᜐ' + BOTTOM_ACCENT,
  to: 'ᜆ' + BOTTOM_ACCENT, tu: 'ᜆ' + BOTTOM_ACCENT,
  wo: 'ᜏ' + BOTTOM_ACCENT, wu: 'ᜏ' + BOTTOM_ACCENT,
  yo: 'ᜌ' + BOTTOM_ACCENT, yu: 'ᜌ' + BOTTOM_ACCENT,
  ngo: 'ᜅ' + BOTTOM_ACCENT, ngu: 'ᜅ' + BOTTOM_ACCENT,

  '.': PUNCT['.'],
  ',': PUNCT[','],
};

const exceptions = {
  mga: 'ᜋᜅ',
  ng:  'ᜅ',
  nang:'ᜅ',
  dyos:'ᜇ᜔ᜌᜓᜐ᜔',
  shi:  'ᜐ' + TOP_ACCENT
};

/**
 * Builds and caches reverse mappings for Baybayin to Latin.
 * Also precomputes a glyph list sorted by length through greedy matching.
 * @returns {{ rev: Record<string,string>, glyphs: string[] }}
 */
const buildReverse = (() => {
  let cache;
  return () => {
    if (cache) return cache;
    const rev = Object.entries(mapBybn).reduce((acc, [latin, bay]) => {
      if (!/[.,]/.test(latin)) acc[bay] = acc[bay] || latin;
      return acc;
    }, {});
    // Accept pamupod variants (swap ᜔ → ᜕)
    for (const [bay, latin] of Object.entries(rev)) {
      if (bay.endsWith(KUDLIT)) {
        const pam = bay.slice(0, -KUDLIT.length) + PAMUDPOD;
        if (!rev[pam]) rev[pam] = latin;
      }
    }
    cache = {
      rev,
      glyphs: Object.keys(rev).sort((a, b) => b.length - a.length)
    };
    return cache;
  };
})();

/* ================ FUNCTIONS ================ */

/**
 * Remove hyphens that appear within Baybayin runs.
 * @param {string} word
 * @returns {string}
 */
function clean(word) {
  return word.replace(/(?<=[ᜀ-᜶])-+(?=[ᜀ-᜶])/g, '');
}

/**
 * Canonicalize Latin input before mapping.
 * Steps:
 * 1) Unicode NFD, strip combining marks.
 * 2) Expand elided “’y” to “ ay”, drop remaining quotes.
 * 3) Normalize letters and common digraphs to the expected inventory.
 * @param {string} word
 * @returns {string}
 */
function normalize(word) {
  let s = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\b(\w+)[’'‘]y\b/gi, '$1 ay').replace(/[’‘']/g, '');
  return s
  .replace(/z/g, 's')
  .replace(/ñ/g, 'ny')
  .replace(/ll/g, 'ly')
  .replace(/ch/g, 'ts')
  .replace(/sh/g, 'sy')
  .replace(/j/g, 'h')
  .replace(/c(?=[eiy])/g, 's')
  .replace(/c/g, 'k')
  .replace(/x/g, 'ks')
  .replace(/v/g, 'b')
  .replace(/q/g, 'k')
  .replace(/f/g, 'p')
  .replace(/th/g, 't')
  .replace(/ph/g, 'p')
  .replace(/tr/g, 'tar')
  .replace(/dr/g, 'dar')
  .replace(/br/g, 'bar')
  .replace(/gr/g, 'gar')
  .replace(/cr/g, 'kar')
  .replace(/fr/g, 'par')
  .replace(/pr/g, 'par')
  .replace(/pl/g, 'pal')
  .replace(/gl/g, 'gal')
  .replace(/cl/g, 'kal')
  .replace(/bl/g, 'bal')
  .replace(/sl/g, 'sal')
  .replace(/fl/g, 'pal');
}

/**
 * Converts Latin to Baybayin (Krus-Kudlit mode).
 * Algorithm:
 * - Lowercase, split on ASCII whitespace.
 * - For each word, apply normalize(), exceptions, and punctuation tables.
 * - Greedy scan choosing tri-graph, bi-graph, then single mappings.
 * - Clean internal hyphens inside Baybayin runs.
 * @param {string} [text='']
 * @returns {string}
 */
export function toBaybayinKrusKudlit(text = '') {
  const out = [];
  for (const raw of `${text}`.toLowerCase().split(/\s+/)) {
    const w = normalize(raw);
    if (!w) { out.push(''); continue; }
    if (exceptions[w]) { out.push(exceptions[w]); continue; }
    if (PUNCT[w])      { out.push(PUNCT[w]);      continue; }

    let acc = '';
    let i = 0;
    while (i < w.length) {
      const tri = w.slice(i, i + 3);
      const bi  = w.slice(i, i + 2);
      const s   = w[i];

      if (mapBybn[tri])         { acc += mapBybn[tri]; i += 3; }
      else if (mapBybn[bi])     { acc += mapBybn[bi];  i += 2; }
      else if (mapBybn[s])      { acc += mapBybn[s];   i += 1; }
      else                    { acc += s;          i += 1; }
    }
    out.push(clean(acc));
  }
  return out.join(' ');
}

/**
 * Converts Latin to Baybayin in Pamupod mode.
 * Produces Krus-Kudlit then swaps into Pamudpod.
 * @param {string} [text='']
 * @returns {string}
 */export function toBaybayinPamupod(text = '') {
  return toBaybayinKrusKudlit(text).replace(/\u1714/g, PAMUDPOD);
}

/**
 * Alias for the current default mode (Krus-Kudlit).
 * @param {string} [text='']
 * @returns {string}
 */
export function toBaybayin(text = '') {
  return toBaybayinKrusKudlit(text);
}

/**
 * Convert Latin text to Baybayin with an explicit mode.
 * @param {string} [text='']
 * @param {{ mode?: 'krus-kudlit'|'pamupod' }} [opts]
 * @returns {string}
 */
export function toBaybayinWithMode(text = '', { mode } = { mode: 'krus-kudlit' }) {
  return mode === 'pamupod' ? toBaybayinPamupod(text) : toBaybayinKrusKudlit(text);
}

/**
 * Converts Baybayin to Latin.
 * Algorithm:
 * - Use the cached reverse map and a glyph list sorted by length.
 * - Greedy match the longest glyph at each position.
 * - Fall back to independent vowels and passthrough for other chars.
 * - Normalize whitespace to single spaces and trim.
 * @param {string} [text='']
 * @returns {string}
 */
export function toLatin(text = '') {
  const { rev, glyphs } = buildReverse();
  const s = `${text}`;
  let res = '';
  let i = 0;

  while (i < s.length) {
    let matched = false;
    for (const g of glyphs) {
      if (s.startsWith(g, i)) {
        res += rev[g];
        i += g.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // independent vowels
    const ch = s[i];
    if (ch === VOWEL_A) { res += 'a'; i += 1; continue; }
    if (ch === VOWEL_I) { res += 'i'; i += 1; continue; }
    if (ch === VOWEL_U) { res += 'u'; i += 1; continue; }

    // whitespace and others
    res += ch === '\u00A0' ? ' ' : ch;
    i += 1;
  }

  return res.replace(/\s+/g, ' ').trim();
}

