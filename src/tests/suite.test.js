// src/tests/suite.test.js

// This file contains tests for the transcription and download functionality of the Baybayin app.
// To test, use npm test in the terminal.

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { toBaybayinWithMode, toLatin } from '../utils/transcription.js';

/**
 * Thin wrappers to keep prior test names stable.
 * Default mode is Krus-Kudlit for Latin → Baybayin.
 */
const translateToBaybayin = (s) => toBaybayinWithMode(s, { mode: 'krus-kudlit' });
const translateToLatin = (s) => toLatin(s);

/* 
=========================
  TRANSLATION TESTS
  
  Verifies:
   - Latin to Baybayin phrase handling
   - Hyphen cleanup inside glyph runs
   - Accent and punctuation mapping
   - Exceptions and all-caps inputs
   - Baybayin to Latin correctness
   - Round-trip normalization
========================= 
*/

describe('Transcription runs between Latin and Baybayin', () => {
  test('Phrases LATIN to BYBN', () => {
    expect(translateToBaybayin('Dahil ayaw kong tumingin sa salamin'))
      .toBe('ᜇᜑᜒᜎ᜔ ᜀᜌᜏ᜔ ᜃᜓᜅ᜔ ᜆᜓᜋᜒᜅᜒᜈ᜔ ᜐ ᜐᜎᜋᜒᜈ᜔'); 

    expect(translateToBaybayin('Kong paulit-ulit na pinipilit'))
      .toBe('ᜃᜓᜅ᜔ ᜉᜂᜎᜒᜆ᜔ᜂᜎᜒᜆ᜔ ᜈ ᜉᜒᜈᜒᜉᜒᜎᜒᜆ᜔'); 

    expect(translateToBaybayin('Magkítâ tayo bukás.'))
      .toBe('ᜋᜄ᜔ᜃᜒᜆ ᜆᜌᜓ ᜊᜓᜃᜐ᜔ //');

    expect(translateToBaybayin('MGA BATA NG BAYAN'))
      .toBe('ᜋᜅ ᜊᜆ ᜅ ᜊᜌᜈ᜔'); 
  });

  test('Phrases BYBN to LATIN', () => {
    expect(translateToLatin('ᜀᜅ᜔ ᜉᜓᜐᜓ ᜃᜓ')).toBe('ang poso ko');
  });

  const canon = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

  test('Round trip normalization', () => {
    const input = 'nakakapagpabagabag';
    const bybn = translateToBaybayin(input);
    const back = translateToLatin(bybn);
    expect(canon(back)).toContain(canon(input));
  });

  test('Exceptions, punctuation, normalization basics', () => {
    expect(translateToBaybayin('mga')).toBe('ᜋᜅ');
    expect(translateToBaybayin('ng')).toBe('ᜅ');
    expect(translateToBaybayin('dyos')).toBe('ᜇ᜔ᜌᜓᜐ᜔');

    expect(translateToBaybayin('a i u e o')).toBe('ᜀ ᜁ ᜂ ᜁ ᜂ');

    expect(translateToBaybayin('bi be bo bu')).toBe('ᜊᜒ ᜊᜒ ᜊᜓ ᜊᜓ');

    expect(translateToBaybayin('oo, sige.')).toBe('ᜂᜂ / ᜐᜒᜄᜒ //');
  });

  test('Hyphen removal between glyphs', () => {
    expect(translateToBaybayin('ulit-ulit')).toBe(translateToBaybayin('ᜂᜎᜒᜆ᜔ᜂᜎᜒᜆ᜔'));
    expect(translateToBaybayin('paulit-ulit')).toContain('ᜂᜎᜒᜆ᜔ᜂᜎᜒᜆ᜔');
  });

});

/* 
=========================
   DOWNLOAD SMOKE TEST (jsdom)

   Verifies:
   - DOM flow for exporting text
   - Build export content from headings and boxes
   - Create a Blob URL
   - Create a temporary anchor, click, then remove
   - Revoke the Blob URL on the next tick
========================= 
*/

describe('DOM Flow runs', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="home-view">
        <div class="tagalog-header"><div id="tagalogTitle">Tagalog</div></div>
        <div class="baybayin-header"><div id="baybayinTitle">Krus-Kudlit</div></div>
        <p id="editableBox">Hello world</p>
        <div id="outputBox">ᜑᜒᜎᜓ ᜏᜓᜇ᜔</div>
        <button class="download-button"></button>
      </section>
    `;

    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(document, 'createElement');
    jest.spyOn(document.body, 'appendChild');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('Download runs', () => {
    const tagalogTitle  = document.getElementById('tagalogTitle');
    const baybayinTitle = document.getElementById('baybayinTitle');
    const edit = document.getElementById('editableBox');
    const out  = document.getElementById('outputBox');
    const btn  = document.querySelector('.download-button');

    const buildExportText = () => {
      const leftTitle  = (tagalogTitle?.textContent || 'Tagalog').trim();
      const rightTitle = (baybayinTitle?.textContent || 'Baybayin').trim();
      const srcText = (edit?.textContent || '').trim();
      const outText = (out?.textContent || '').trim();
      return `${leftTitle}:\n${srcText}\n\n${rightTitle}:\n${outText}\n\nMode: Krus-Kudlit\n`;
    };

    const downloadText = (filename, content) => {
      const normalized = String(content).replace(/\r?\n/g, '\n');
      const blob = new Blob([normalized], { type: 'text/plain;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      jest.spyOn(a, 'click').mockImplementation(() => {});
      jest.spyOn(a, 'remove').mockImplementation(() => {});
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 0);
    };

    btn.addEventListener('click', () => {
      const content = buildExportText();
      downloadText('bybyn-TEST.txt', content);
    });

    btn.click();

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalledTimes(1);

    const anchor = document.body.appendChild.mock.calls[0][0];
    expect(anchor.download).toBe('bybyn-TEST.txt');
    expect(anchor.href).toBe('blob:mock');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalledTimes(1);

    jest.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
