/* 
AUTHOR: Kenneth Agonoy 
LOCATION: .../src/utils/download.js
LAST EDITED: 2025-08-22

PURPOSE:
- Includes the ability to download text content as a file with a timestamped filename.
*/

/**
 * Normalizes line endings to LF.
 * @param {unknown} content
 * @returns {string}
 */
function normalizeNewlines(content) {
  return String(content).replace(/\r?\n/g, "\n");
}

/**
 * Generate a timestamped filename.
 * Example: bybyn-20250818-1225.txt
 * @param {string} [prefix ='bybyn']
 * @param {string} [ext ='txt']
 * @param {Date} [date = new Date()]
 * @returns {string}
 */
function timestampName(prefix = "bybyn", ext = "txt", date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = [
    date.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate())
  ].join("");
  return `${prefix}-${stamp}.${ext}`;
}

/**
 * Trigger a client-side download of plain text.
 * Uses createObjectURL when available and falls back to a data URL.
 * @param {string} filename
 * @param {string} content
 * @param {Document|null} [doc = globalThis.document]
 * @param {typeof URL|null} [url = globalThis.URL]
 */
function downloadText(filename, content, doc = global.document, url = global.URL) {
  const blob = new Blob([normalizeNewlines(content)], { type: "text/plain;charset=utf-8" });
  const href = url.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = href;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => url.revokeObjectURL(href), 0);
}

module.exports = { downloadText, timestampName };















