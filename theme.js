/* Run before styles load so the saved theme is applied before the first paint. */
(function () {
  'use strict';

  var storageKey = 'lokerInternCS.theme.v1';
  var root = document.documentElement;
  var systemTheme = null;
  var savedTheme = null;
  var explicitChoice = false;

  try { systemTheme = window.matchMedia('(prefers-color-scheme: dark)'); } catch (_) {}
  try { savedTheme = window.localStorage.getItem(storageKey); } catch (_) {}
  if (savedTheme === 'dark' || savedTheme === 'light') explicitChoice = true;

  function refreshButton() {
    var button = document.getElementById('theme-toggle');
    var label = document.getElementById('theme-label');
    var dark = root.getAttribute('data-theme') === 'dark';
    if (label) label.textContent = dark ? 'Gelap' : 'Terang';
    if (!button) return;
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', 'Ganti ke tema ' + (dark ? 'terang' : 'gelap'));
    button.title = 'Ganti ke tema ' + (dark ? 'terang' : 'gelap');
    button.setAttribute('data-current-theme', dark ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    refreshButton();
  }

  applyTheme(explicitChoice ? savedTheme : (systemTheme && systemTheme.matches ? 'dark' : 'light'));

  function bindToggle() {
    var button = document.getElementById('theme-toggle');
    refreshButton();
    if (!button) return;
    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      explicitChoice = true;
      applyTheme(next);
      try { window.localStorage.setItem(storageKey, next); } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggle, { once: true });
  } else {
    bindToggle();
  }

  function followSystem(event) {
    if (!explicitChoice) applyTheme(event.matches ? 'dark' : 'light');
  }
  if (systemTheme) {
    if (systemTheme.addEventListener) systemTheme.addEventListener('change', followSystem);
    else if (systemTheme.addListener) systemTheme.addListener(followSystem);
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== storageKey) return;
    if (event.newValue === 'dark' || event.newValue === 'light') {
      explicitChoice = true;
      applyTheme(event.newValue);
    } else if (event.newValue === null) {
      explicitChoice = false;
      applyTheme(systemTheme && systemTheme.matches ? 'dark' : 'light');
    }
  });
})();
