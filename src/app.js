/* 
AUTHOR: Kenneth Agonoy 
LOCATION: /.../src/app.js
LAST EDITED: 2025-08-18

PURPOSE:
- Initialize shared services and put them into views.
- Primary controller view: run its initializer and call its teardown when navigating away.
- Provide a small hash-based router for views: Home.
- Run application's header animation.
*/

import * as baybayin from './utils/transcription.js';
import { initHome } from './views/home.js';

let teardown = null;

const services = {
  baybayin,
  intl: { translate: baybayin.intlTranslate }
};

const routes = {
  '':       () => mount(initHome, 'home-view'),
  '#/home': () => mount(initHome, 'home-view')
};

const btn = document.querySelector('.translator-button');

/* ================ FUNCTIONS ================ */

/**
 * Shows a view using the id.
 * @param {string} id - The id of the <section data-view> to show.
*/
function show(id) {
  document.querySelectorAll('section[data-view]').forEach((el) => {
    const visible = el.id === id;
    el.hidden = !visible;
    el.setAttribute('aria-hidden', String(!visible));
  });
}

/**
 * Mount a view and register its teardown.
 * Calls the view initializer with shared services, then stores its teardown if any.
 * @param {ViewInit} viewInit - The initializer for the target view.
 * @param {string} id - The id of the <section data-view> to reveal.
*/
function mount(viewInit, id) {
  show(id);
  teardown?.();
  teardown = typeof viewInit === 'function' ? viewInit(services) : null;
}

/**
 * Resolve and run the current route by falls back to the default route when the hash is unknown.
*/
function router() {
  (routes[location.hash] || routes[''])();
}

/**
 * Split the header title into spans for per-letter animation.
 * Idempotent by design. Safe to call multiple times.
 */
function splitHeaderLetters() {
  const h1 = document.querySelector('.header-title01');
  if (!h1 || h1.dataset.split === '1') return;

  const text = h1.textContent;
  h1.setAttribute('aria-label', text.trim());
  h1.textContent = '';

  Array.from(text).forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch;
    span.style.setProperty('--i', i);
    h1.appendChild(span);
  });

  h1.dataset.split = '1';
}

/* ================ EVENT LISTENERS ================ */

btn.addEventListener('click', () => {
  btn.classList.toggle('rotated');
});

window.addEventListener('hashchange', router);

window.addEventListener('DOMContentLoaded', () => {
  if (!routes[location.hash]) history.replaceState(null, '', location.pathname + location.search);
  router();
  splitHeaderLetters();
});

