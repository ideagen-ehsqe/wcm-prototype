/* ============================================================================
   praxis-profile-menu.js — the profile menu's CONTENTS, in one place.

   praxis-profile-menu.css unified the styling; this unifies the markup. It was
   duplicated across 20 pages (ten admin pages via build-admin.py, plus index,
   search, report management, contextual awareness and the six record pages),
   which is why the menus had already drifted: the record pages listed a
   different set of destinations from admin, report management carried an extra
   one, and Settings appeared on all of them long after it stopped going
   anywhere.

   WHAT THIS TOUCHES
   Only the inside of .profile-menu__pop. The trigger (the avatar button) and
   the .profile-menu__pop element itself are left alone, because each page wires
   its own open/close against them by id — sp-avatar / rp-profile-pop and so on.
   Replacing only the contents means that still works untouched.

   The page's own .profile-menu__head is preserved if present: the name and role
   are the page's persona, not chrome.

   Behaviour for everything inside is owned here — the theme switch, sign out
   and the current-page marker — since the nodes the pages used to bind to no
   longer exist. Runs on DOMContentLoaded, so it lands after the pages' inline
   scripts; any binding they made to the old nodes simply goes with them.
   ========================================================================= */
(function () {
  'use strict';

  var APP_VERSION = '25.3.1';
  var BUILD_NUMBER = '2026.08.04·1';

  /* Icons are Lucide names, not Material ligatures. praxis-lucide.js only
     rewrites ligatures it has a mapping for — plain "smartphone", "assessment",
     "login", "palette" and "animation" aren't keys in that table, so they
     rendered as empty placeholder circles. data-lucide is resolved directly.
     Every name below is present in vendor/lucide.min.js. */

  /* Account actions. Only Profile resolves in the prototype; the rest are the
     real menu's entries and are here so the shape is right. */
  var ACCOUNT = [
    { label: 'Profile',         icon: 'user',           href: 'profile.html' },
    { label: 'Requests',        icon: 'inbox' },
    { label: 'Messages',        icon: 'mail' },
    { label: 'Activate Mobile', icon: 'smartphone' },
    { label: 'Help',            icon: 'circle-help' },
    { label: 'Newsletter',      icon: 'megaphone' },
    { label: 'Accessibility',   icon: 'accessibility' }
  ];

  /* Prototype convenience links — the "Switch to" set, plus the two labs. Union
     of what the pages carried individually, so no page loses a destination. */
  var SWITCH_TO = [
    { label: 'Workspace',             icon: 'layout-dashboard', href: 'index.html' },
    { label: 'Contextual Awareness',  icon: 'layout-dashboard', href: 'contextual-awareness.html' },
    { label: 'Search',                icon: 'search',           href: 'search-page.html' },
    { label: 'Incident record',       icon: 'file-text',        href: 'record-page.html' },
    { label: 'Report management',     icon: 'clipboard-list',   href: 'report-management.html' },
    { label: 'Admin',                 icon: 'settings',         href: 'admin-users.html' },
    { label: 'Login',                 icon: 'log-in',           href: 'login.html' },
    { label: 'Design system',         icon: 'palette',          href: 'ds/index.html' },
    { label: 'Animation lab',         icon: 'sparkles',         href: 'animation-lab.html' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ico(name) {
    return '<i data-lucide="' + name + '" class="icon icon--20" aria-hidden="true"></i>';
  }
  function row(item) {
    var body = ico(item.icon) + esc(item.label);
    /* A destination gets an <a>; a placeholder gets a <button>, so it doesn't
       advertise a link to nowhere or move the page on click. */
    return item.href
      ? '<a class="profile-menu__item" role="menuitem" href="' + esc(item.href) + '">' + body + '</a>'
      : '<button class="profile-menu__item" type="button" role="menuitem">' + body + '</button>';
  }
  var sep = '<div class="profile-menu__sep" role="separator"></div>';

  function build(head) {
    return [
      head || '',
      ACCOUNT.map(row).join(''),
      row({ label: 'Privacy Policy', icon: 'shield-check' }),
      /* Version and build are read-outs, not actions — no role="menuitem", so
         keyboard menu navigation skips them rather than landing on dead rows.
         Both sit below Privacy Policy, which also puts the last actionable row
         above them and keeps the two read-outs together at the foot. */
      '<div class="profile-menu__meta">Version ' + esc(APP_VERSION) + '</div>',
      '<div class="profile-menu__meta">Build ' + esc(BUILD_NUMBER) + '</div>',
      sep,
      '<div class="profile-menu__navlabel">Switch to</div>',
      SWITCH_TO.map(row).join(''),
      sep,
      '<div class="profile-menu__row">',
      '  <span class="profile-menu__row-label">Appearance</span>',
      '  <div class="verswitch" role="group" aria-label="Appearance">',
      '    <button class="verswitch__opt" type="button" data-theme-btn="light" aria-pressed="false">Light</button>',
      '    <button class="verswitch__opt" type="button" data-theme-btn="dark" aria-pressed="false">Dark</button>',
      '  </div>',
      '</div>',
      sep,
      '<button class="profile-menu__item" type="button" role="menuitem" data-signout>' + ico('log-out') + 'Sign out</button>'
    ].join('');
  }

  function markCurrent(pop) {
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    pop.querySelectorAll('a.profile-menu__item[href]').forEach(function (a) {
      var target = (a.getAttribute('href').split('/').pop() || '').toLowerCase();
      if (target && target === here) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function wireTheme(pop) {
    var btns = pop.querySelectorAll('[data-theme-btn]');
    function paint() {
      var cur = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
      btns.forEach(function (b) {
        var on = b.getAttribute('data-theme-btn') === cur;
        b.classList.toggle('verswitch__opt--active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-theme-btn');
        if (v === 'dark') document.body.dataset.theme = 'dark';
        else document.body.setAttribute('data-theme', 'light');
        /* 'gl-theme' is the key every page's pre-render theme script reads
           (21 writes / 22 reads across the prototype). An earlier draft here
           wrote 'px-theme', which nothing reads — the toggle worked until you
           navigated, then the theme reverted. */
        try { localStorage.setItem('gl-theme', v); } catch (e) {}
        paint();
      });
    });
    paint();
  }

  function wireSignOut(pop) {
    var btn = pop.querySelector('[data-signout]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      try { sessionStorage.removeItem('gl-authed'); } catch (e) {}
      location.href = 'login.html';
    });
  }

  function start() {
    document.querySelectorAll('.profile-menu').forEach(function (host) {
      var pop = host.querySelector('.profile-menu__pop');
      if (!pop || pop.dataset.pxBuilt) return;
      var headEl = pop.querySelector('.profile-menu__head');
      pop.innerHTML = build(headEl ? headEl.outerHTML : '');
      pop.dataset.pxBuilt = '1';
      markCurrent(pop);
      wireTheme(pop);
      wireSignOut(pop);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
