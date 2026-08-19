/* ============================================================================
   Praxis nav drawer — the nav rail's phone form
   ============================================================================
   At phone widths the 56px icon rail costs a sixth of the viewport and its
   items are unlabelled. Below --px-phone (640px) the rail is hidden by CSS and
   this script puts a hamburger in the app bar's left corner that opens a
   drawer listing the same destinations WITH text labels.

   It DERIVES the drawer from the live rail rather than duplicating the markup,
   so a rail change propagates automatically and there is nothing to keep in
   sync across 20+ pages. Labels come from each item's aria-label / title.

   Create leads the list as a filled action, matching the Mazlan drawer, so the
   drawer is self-sufficient on pages with no in-page Create button.

   Self-wiring: include the script, nothing else. It no-ops on pages with no
   nav rail.
   ========================================================================= */
(function () {
  'use strict';

  var rail = document.querySelector('.ehsq-navrail');
  var bar = document.querySelector('.appbar');
  if (!rail || !bar || document.querySelector('.px-navdrawer')) return;

  /* ---- read the destinations off the rail ------------------------------- */
  function labelFor(el) {
    var l = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (!l) {
      var img = el.querySelector('img[alt]');
      if (img) l = img.getAttribute('alt');
    }
    return l.trim();
  }

  /* Which item is the page in view? The rail marks it with a class on some
     pages and not others, so fall back to matching the link target against the
     current filename. */
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function isCurrent(el) {
    if (el.classList.contains('ehsq-navrail__btn--active') ||
        el.classList.contains('ehsq-navrail__link--active') ||
        el.getAttribute('aria-current') === 'page') return true;
    var href = el.getAttribute && el.getAttribute('href');
    if (!href) return false;
    var target = href.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
    return !!target && target === here;
  }

  var items = [];
  /* Create leads the list as a filled action — that's how the Mazlan drawer is
     built, and it makes the drawer self-sufficient on pages that have no
     in-page Create button. */
  var createBtn = rail.querySelector('.ehsq-navrail__btn--create');
  if (createBtn) items.push({
    label: 'Create new', href: null, active: false, create: true,
    glyph: '<span class="material-symbols-rounded">add</span>', source: createBtn
  });
  rail.querySelectorAll('.ehsq-navrail__link, .ehsq-navrail__btn').forEach(function (el) {
    if (el.classList.contains('ehsq-navrail__btn--create')) return;   // added above
    var label = labelFor(el);
    if (!label) return;
    items.push({
      label: label,
      href: el.tagName === 'A' ? el.getAttribute('href') : null,
      active: isCurrent(el),
      /* Clone the glyph rather than re-deriving it. praxis-lucide.js may have
         already swapped a Material ligature for an SVG, and cloning captures
         whichever form is live at this moment. */
      glyph: (el.querySelector('svg, i, .material-symbols-rounded, img') || {}).outerHTML || '',
      source: el
    });
  });
  /* The admin side nav is hidden at this width too (it's 60px of unlabelled
     icons and it breaks the gutter alignment). Fold its destinations in under
     a heading so nothing becomes unreachable. */
  var adminNav = document.querySelector('.adminnav');
  var adminItems = [];
  if (adminNav) {
    adminNav.querySelectorAll('a[href]').forEach(function (a) {
      var label = (a.textContent || '').trim() || labelFor(a);
      if (!label) return;
      adminItems.push({
        label: label, href: a.getAttribute('href'),
        active: isCurrent(a),
        glyph: (a.querySelector('svg, i, .material-symbols-rounded') || {}).outerHTML || '',
        source: a
      });
    });
  }

  if (!items.length && !adminItems.length) return;

  /* ---- build ----------------------------------------------------------- */
  var scrim = document.createElement('div');
  scrim.className = 'px-navdrawer__scrim';
  scrim.hidden = true;

  var drawer = document.createElement('nav');
  drawer.className = 'px-navdrawer';
  drawer.setAttribute('aria-label', 'Primary navigation');
  drawer.hidden = true;
  /* Brand block in the head, matching the Mazlan drawer. The mark is the
     product logo from the nav rail when it's there, else the gradient hex. */
  var BRAND_MARK =
    '<svg viewBox="0 0 34.64 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M0 10V30L17.32 40L34.64 30V10L17.32 0L0 10Z" fill="url(#px-nav-grad)"/>' +
      '<path opacity="0.2" d="M0 30L17.32 40L34.64 30V10L0 30Z" fill="white"/>' +
      '<defs><linearGradient id="px-nav-grad" x1="3.66" y1="33.66" x2="30.98" y2="6.34" gradientUnits="userSpaceOnUse">' +
        '<stop stop-color="#E2408E"/><stop offset="0.998" stop-color="#45BBCE"/>' +
      '</linearGradient></defs></svg>';
  drawer.innerHTML =
    '<div class="px-navdrawer__head">' +
      '<div class="px-navdrawer__brand">' + BRAND_MARK + '<span>EHSQ Enterprise</span></div>' +
      '<button class="px-navdrawer__close" type="button" aria-label="Close navigation">' +
        '<span class="material-symbols-rounded">close</span></button>' +
    '</div><ul class="px-navdrawer__list"></ul>';

  var list = drawer.querySelector('.px-navdrawer__list');
  items.forEach(function (it) {
    var li = document.createElement('li');
    var node = document.createElement(it.href ? 'a' : 'button');
    node.className = 'px-navdrawer__item' + (it.active ? ' px-navdrawer__item--active' : '')
                   + (it.create ? ' px-navdrawer__item--create' : '');
    if (it.href) { node.href = it.href; } else { node.type = 'button'; }
    if (it.active) node.setAttribute('aria-current', 'page');
    node.innerHTML = '<span class="px-navdrawer__icon" aria-hidden="true">' + it.glyph + '</span>' +
                     '<span class="px-navdrawer__label"></span>';
    node.querySelector('.px-navdrawer__label').textContent = it.label;
    /* A rail button does something on this page rather than navigating, so
       forward the click to the original control instead of reimplementing it. */
    if (!it.href) {
      node.addEventListener('click', function () { close(); it.source.click(); });
    } else {
      node.addEventListener('click', close);
    }
    li.appendChild(node);
    list.appendChild(li);
  });

  if (adminItems.length) {
    var head = document.createElement('li');
    head.className = 'px-navdrawer__group';
    head.textContent = 'Admin';
    list.appendChild(head);
    adminItems.forEach(function (it) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'px-navdrawer__item' + (it.active ? ' px-navdrawer__item--active' : '');
      a.href = it.href;
      if (it.active) a.setAttribute('aria-current', 'page');
      a.innerHTML = '<span class="px-navdrawer__icon" aria-hidden="true">' + it.glyph + '</span>' +
                    '<span class="px-navdrawer__label"></span>';
      a.querySelector('.px-navdrawer__label').textContent = it.label;
      a.addEventListener('click', close);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  var toggle = document.createElement('button');
  toggle.className = 'px-navtoggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'px-navdrawer');
  toggle.innerHTML = '<span class="material-symbols-rounded">menu</span>';
  drawer.id = 'px-navdrawer';

  bar.insertBefore(toggle, bar.firstChild);
  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  /* ---- behaviour ------------------------------------------------------- */
  var prevFocus = null;

  function open() {
    prevFocus = document.activeElement;
    scrim.hidden = false; drawer.hidden = false;
    // next frame, so the transition has a from-state to animate out of
    requestAnimationFrame(function () {
      scrim.classList.add('is-open'); drawer.classList.add('is-open');
    });
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var first = drawer.querySelector('.px-navdrawer__item');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function close() {
    scrim.classList.remove('is-open'); drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () { scrim.hidden = true; drawer.hidden = true; }, 220);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }

  function isOpen() { return !drawer.hidden; }

  toggle.addEventListener('click', function () { isOpen() ? close() : open(); });
  scrim.addEventListener('click', close);
  drawer.querySelector('.px-navdrawer__close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close();
  });

  /* Focus trap while open — the drawer is modal over the page. */
  drawer.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = drawer.querySelectorAll('a[href], button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Growing past the phone breakpoint brings the rail back, so the drawer must
     not be left open behind it. */
  var mq = window.matchMedia('(min-width: 641px)');
  mq.addEventListener('change', function (e) { if (e.matches && isOpen()) close(); });
})();
