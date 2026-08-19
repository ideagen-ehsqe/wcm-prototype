/* ============================================================================
   praxis-breadcrumb-back.js — the toolbar back button, driven by the breadcrumb.

   Every page's toolbar carries a back button that did nothing. It should step
   one level up the breadcrumb trail, ending at the workspace.

   WHY THIS ISN'T JUST location.href = lastCrumb.href

   The breadcrumb markup is consistent — <nav class="breadcrumb"> with <a>
   ancestors, .breadcrumb__sep separators and a final .breadcrumb__current — but
   the hrefs are not. Six of the twenty pages point their ancestors at "#":
   search, record-page, record-page-capa, record-page-inspection and
   contextual-awareness. Following the nearest href would leave the button dead
   on exactly the pages people use most.

   Worse, some ancestors name a page that doesn't exist in the prototype at all.
   record-page's trail is Home > Incident Management > INC-2024-001234; there is
   no Incident Management list page, and resolving it to record-page.html would
   point the button at the page it's already on.

   So resolution walks the trail from nearest to furthest and takes the first
   ancestor that resolves to a real, different page:

     1. a genuine href (not "#")            → use it
     2. otherwise a known label             → use its page
     3. resolves to the current page        → skip, keep walking up
     4. nothing resolves                    → the workspace

   That last rule is what "terminating at the workspace" means in practice, and
   it's also why repeated presses converge there: each press is a real
   navigation, so the next page's own breadcrumb decides the step after it.
   ========================================================================= */
(function () {
  'use strict';

  var WORKSPACE = 'index.html';

  /* Ancestors written as "#". Keyed by the label shown in the crumb. Anything
     absent here is treated as unresolvable and skipped — which is the right
     outcome for "Incident Management" and friends, since no such page exists. */
  var LABEL_TO_PAGE = {
    'ideagen default': WORKSPACE,
    'home': WORKSPACE,
    'workspace': WORKSPACE,
    'quality overview': 'contextual-awareness.html',
    'admin': 'admin-users.html',
    'report management': 'report-management.html',
    'new search': 'search-page.html'
  };

  function pageOf(url) {
    if (!url) return '';
    return (url.split('#')[0].split('?')[0].split('/').pop() || '').toLowerCase();
  }

  var here = pageOf(location.pathname) || WORKSPACE;

  function findBackButton() {
    var bar = document.querySelector('.toolbar');
    if (!bar) return null;
    var candidates = bar.querySelectorAll('.tbtn--icon, .tbtn');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var label = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
      var hasArrow = !!el.querySelector('[data-lucide="arrow-left"], [data-lucide="chevron-left"]');
      if (/\bback\b/.test(label) || hasArrow) return el;
    }
    return null;
  }

  function resolveTarget() {
    var crumbs = document.querySelectorAll('.breadcrumb a');
    /* Nearest ancestor last, so walk backwards. */
    for (var i = crumbs.length - 1; i >= 0; i--) {
      var a = crumbs[i];
      var href = (a.getAttribute('href') || '').trim();
      var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      var page = '';
      if (href && href !== '#') page = pageOf(href);
      if (!page) page = LABEL_TO_PAGE[label.toLowerCase()] || '';
      if (!page) continue;                 // unresolvable — keep walking up
      if (pageOf(page) === here) continue; // already here — keep walking up
      return { page: page, label: label };
    }
    return here === WORKSPACE ? null : { page: WORKSPACE, label: 'Workspace' };
  }

  function start() {
    var btn = findBackButton();
    if (!btn) return;
    var target = resolveTarget();

    /* At the workspace there is nowhere up to go. Disable rather than remove, so
       the toolbar keeps its shape and the compact toolbar still finds it. */
    if (!target) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'Already at the workspace';
      return;
    }

    /* Name the destination — an unlabelled arrow gives no clue where it lands. */
    btn.setAttribute('aria-label', 'Back to ' + target.label);
    btn.title = 'Back to ' + target.label;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      location.href = target.page;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
