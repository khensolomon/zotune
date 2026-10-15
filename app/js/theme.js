// Applies the chosen theme before the page paints (loaded as a classic script
// in <head>). The choice is a per-device convenience kept in localStorage;
// without it the page follows the system setting.
(function () {
  'use strict';
  var KEY = 'zotune.theme';
  var root = document.documentElement;
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function apply(choice) {
    if (choice === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    var isDark = choice === 'dark' || (choice === 'auto' && dark.matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#141210' : '#ffffff');
  }

  apply(read());
  dark.addEventListener('change', function () {
    apply(read());
  });

  window.zotuneTheme = {
    get: read,
    set: function (choice) {
      if (choice !== 'light' && choice !== 'dark' && choice !== 'auto') throw new Error('Unknown theme: ' + choice);
      try {
        if (choice === 'auto') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, choice);
      } catch (e) {
        /* Storage blocked: the choice lasts until the page closes. */
      }
      apply(choice);
    }
  };
})();
