/* 
AUTHOR: Kenneth Agonoy 
LOCATION: .../src/views/home.js
LAST EDITED: 2025-08-22

PURPOSE:
- Initalization of the Home View
- Binding Events, setting inital states, and returns a teardown that removes listeners. 
*/

export function initHome(services) {
  
  const root = document.getElementById('home-view');
  if (!root) return () => {};

  /* ================ PANELS & HEADERS ================ */
  const edit  = root.querySelector('#editableBoxHome') || root.querySelector('#editableBox');
  const out   = root.querySelector('#outputBoxHome')  || root.querySelector('#outputBox');
  const titleTagalog  = root.querySelector('#tagalogTitleHome')  || root.querySelector('#tagalogTitle');
  const titleBaybayin = root.querySelector('#baybayinTitleHome') || root.querySelector('#baybayinTitle');

  const tagalogHeader  = titleTagalog?.closest('.tagalog-header') || null;
  const baybayinHeader = titleBaybayin?.closest('.baybayin-header') || null;
  const modeBtn = root.querySelector('.baybayin-header .change-button');
  
  const modeLabel = () => (mode === 'pamupod' ? 'Pamupod' : 'Krus-Kudlit');  // Current mode label for headings

  // Constants for the download functionality.
  const downloadBtn = root.querySelector('.download-button'); 
  const onDownloadClick = () => { 
  const content = buildExportText();
  const filename = timestampName('bybyn');
    downloadText(filename, content);
  };

  const { baybayin } = services || {};
  if (!edit || !out || !baybayin?.toBaybayin) return () => {};

  /* ================ RESILIENT DOWNLOAD HELPERS ================ */

  // Local Fallbacks
  let downloadText = (filename, content) => {
    const normalized = String(content).replace(/\r?\n/g, '\n');
    const blob = new Blob([normalized], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  let timestampName = (prefix = 'bybyn', ext = 'txt', d = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`;
  };

  // Attempts to load helpers, but includes fallbacks. The dynamic import is intentional to avoid top level importing errors.
  import('../utils/download.js').then((mod) => {
    if (typeof mod.downloadText === 'function') downloadText = mod.downloadText;
    if (typeof mod.timestampName === 'function') timestampName = mod.timestampName;
  }).catch(() => { /* keep fallbacks */ });

  /* ================ UI STATES ================ */
  let isSwapped = false;      // false: Tagalog (editable), Baybayin right (readonly)
  let mode = 'krus-kudlit';   // or 'pamupod'

  try {
    const saved = sessionStorage.getItem('bybyn:mode');
    if (saved === 'pamupod' || saved === 'krus-kudlit') mode = saved;
  } catch {}

  /* ================ HELPERS ================ */

  /**
   * Route text through the converter that matches the active mode.
   * Falls back to available methods for compatibility with older services.
   * @param {string} text
   * @returns {string}
   */
    function translateWithMode(text) {
    if (typeof baybayin.toBaybayinWithMode === 'function') {
      return baybayin.toBaybayinWithMode(text, { mode }) || '';
    }
    if (mode === 'pamupod' && typeof baybayin.toBaybayinPamupod === 'function') {
      return baybayin.toBaybayinPamupod(text) || '';
    }
    if (mode === 'krus-kudlit' && typeof baybayin.toBaybayinKrusKudlit === 'function') {
      return baybayin.toBaybayinKrusKudlit(text) || '';
    }
    return baybayin.toBaybayin(text) || '';
  }

  /**
   * Return the node that currently shows Baybayin text.
   * This depends on the heading labels rather than layout assumptions.
   * @returns {HTMLElement|null}
   */
  function baybayinBox() {
    const leftIsBaybayin = titleTagalog?.innerText.trim().toLowerCase() !== 'tagalog';
    return leftIsBaybayin ? edit : out;
  }

  /**
   * Apply classes and data attributes that reflect the active mode.
   * Keeps CSS selectors stable regardless of panel order.
   */
  function applyModeStyling() {
    const bayBox = baybayinBox();
    const other  = bayBox === edit ? out : edit;
    bayBox?.classList.add('baybayin-panel');
    other?.classList.add('baybayin-panel');
    bayBox?.setAttribute('data-mode', mode);
    other?.removeAttribute('data-mode');
  }

  /**
   * Flip killer marks in place to match the active mode.
   * Acts as a safety net if the source already contains marks.
   */
  function enforceKillerStyle() {
    const box = baybayinBox();
    if (!box) return;
    const text = box.innerText || '';
    const fixed = mode === 'pamupod'
      ? text.replace(/\u1714/g, '\u1715')
      : text.replace(/\u1715/g, '\u1714');
    if (fixed !== text) box.innerText = fixed;
  }

  /**
   * Place the mode button under the header that currently shows Baybayin.
   */
  function placeModeButton() {
    if (!modeBtn) return;
    const leftText  = (titleTagalog?.innerText || '').trim().toLowerCase();
    const bayIsLeft = leftText === modeLabel().toLowerCase();
    if (bayIsLeft && tagalogHeader) tagalogHeader.appendChild(modeBtn);
    else if (!bayIsLeft && baybayinHeader) baybayinHeader.appendChild(modeBtn);
  }

  /**
   * Render the output panel from the editable source.
   * Uses mode-aware translation or reverse conversion when swapped.
   */
  function render() {
    const src = edit.innerText || '';
    const result = isSwapped
      ? (services.baybayin.toLatin?.(src) || '')
      : translateWithMode(src);
    out.innerText = result;
    enforceKillerStyle();
  }

  /**
   * Paste handler for contenteditable.
   * Inserts plain text only and re-renders.
   */
  function handlePaste(e) {
    if (!edit.isContentEditable) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    sel.deleteFromDocument();
    sel.getRangeAt(0).insertNode(document.createTextNode(text));
    sel.collapseToEnd();
    render();
  }

  /**
   * Swap headings and contents between Tagalog and Baybayin panels.
   * Maintains contenteditable on the left panel and readonly on the right.
   */
  function switchFormats() {
    if (!titleTagalog || !titleBaybayin) return;

    const tagalogWasLeft = titleTagalog.innerText.trim().toLowerCase() === 'tagalog';

    if (tagalogWasLeft) {
      titleTagalog.innerText = modeLabel();
      titleBaybayin.innerText = 'Tagalog';
    } else {
      titleTagalog.innerText = 'Tagalog';
      titleBaybayin.innerText = modeLabel();
    }

    // Swap contents
    const t = edit.innerText;
    edit.innerText = out.innerText;
    out.innerText  = t;

    edit.setAttribute('contenteditable', 'true');
    out.setAttribute('contenteditable', 'false');

    isSwapped = !isSwapped;

    placeModeButton();
    applyModeStyling();
    enforceKillerStyle();
    render();
  }

  /**
   * Toggle between Krus-Kudlit and Pamupod modes.
   * Updates labels, styling, and stored preference.
   */
  function toggleMode() {
    mode = mode === 'krus-kudlit' ? 'pamupod' : 'krus-kudlit';

    const leftIsBaybayin = titleTagalog?.innerText.trim().toLowerCase() !== 'tagalog';
    if (leftIsBaybayin) {
      titleTagalog.innerText = modeLabel();
    } else {
      titleBaybayin.innerText = modeLabel();
    }

    if (!isSwapped) render();
    else enforceKillerStyle();

    applyModeStyling();
    placeModeButton();

    // ANIMATION: Rotate the change-button icon each toggle.
    modeBtn?.classList.toggle('rotated');

    try { sessionStorage.setItem('bybyn:mode', mode); } catch {}
  }

  /**
   * Build the text block used for export.
   * Includes headings, source, output, and the current mode label.
   * @returns {string}
   */
  function buildExportText() {
    const leftTitle  = (titleTagalog?.innerText || 'Tagalog').trim();
    const rightTitle = (titleBaybayin?.innerText || 'Baybayin').trim();
    const srcText = (edit?.innerText || '').trim();
    const outText = (out?.innerText || '').trim();
    return `${leftTitle}:\n${srcText}\n\n${rightTitle}:\n${outText}\n\nMode: ${modeLabel()}\n`;
  }

  placeModeButton();
  applyModeStyling();
  enforceKillerStyle();

  /* ================ INITALIZATIONS ================ */
  // Expose actions for UI bindings that rely on globals.
  window.switchFormats = switchFormats;
  window.toggleBaybayinMode = toggleMode;
 
  // Ensure headings are populated and reflect the active mode.
  if (titleBaybayin) titleBaybayin.innerText = modeLabel();
  if (titleTagalog && titleTagalog.innerText.trim() === '') titleTagalog.innerText = 'Tagalog';
  if (mode === 'pamupod') modeBtn?.classList.add('rotated');

  // Live rendering from the editable panel.
  edit.addEventListener('input', render);
  edit.addEventListener('paste', handlePaste);
  render();

  // Mode button and download button.
  const onModeClick = (e) => { e.preventDefault(); e.stopPropagation(); toggleMode(); };
  if (modeBtn) {
    modeBtn.removeAttribute?.('onclick');
    modeBtn.addEventListener('click', onModeClick);
  }
  downloadBtn?.addEventListener('click', onDownloadClick);

  // Seed session state on navigation to translator routes.
  const navTriggers = root.querySelectorAll('a[href*="#/translate"], [data-action="open-translate"], .translator-button');
  const seed = () => {
    try {
      sessionStorage.setItem('bybyn:seed', edit?.innerText || '');
      sessionStorage.setItem('bybyn:mode', mode);
    } catch {}
  };
  navTriggers.forEach((el) => el.addEventListener('click', seed, { capture: true }));

  /* ================ TEARDOWNS ================ */
  return () => {
    edit.removeEventListener('input', render);
    edit.removeEventListener('paste', handlePaste);
    if (modeBtn) modeBtn.removeEventListener('click', onModeClick);
    if (downloadBtn) downloadBtn.removeEventListener('click', onDownloadClick);
    navTriggers.forEach((el) => el.removeEventListener('click', seed, { capture: true }));
  };
}
