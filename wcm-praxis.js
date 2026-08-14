/* =====================================================================
   WCM prototype — behaviour.

   Ported from "WCM Prototype 2.html" with the same scenario, the same
   scenes and the same narration. Differences from the original are
   structural, not narrative:

     - one delegated click handler on [data-act] instead of ~60 inline
       onclick attributes
     - views, workflow steps and status chips are driven by data
       attributes, so a state change is one call rather than a run of
       classList/innerHTML edits per element
     - dialogs and drawers use the [hidden] attribute (what the Praxis
       .cn-* and .px-pop materials are written against) rather than an
       .on class, and Escape closes the topmost one
     - the theme is written to localStorage['gl-theme'], the key Praxis
       reads, so it survives a reload
   ===================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ================================================================ roles */
  var ROLES = {
    planner: { name: 'Julia O’Connell', tag: 'Planner',                          init: 'jo' },
    iso:     { name: 'J. Müller',       tag: 'Isolating authority',              init: 'jm' },
    auth:    { name: 'A. Kowalski',     tag: 'Authorising person',               init: 'ak' },
    tech:    { name: 'T. Wright',       tag: 'Technician',                       init: 'tw' },
    rps:     { name: 'R. Voß',          tag: 'Radiation protection supervisor',  init: 'rv' }
  };
  var ROLE_ORDER = ['planner', 'iso', 'auth', 'tech', 'rps'];
  var role = 'planner';

  function renderRoleList() {
    var host = $('#roleList');
    host.innerHTML = ROLE_ORDER.map(function (key) {
      var r = ROLES[key];
      return '<button class="wcm-role__opt" type="button" role="radio" data-act="set-role" data-role="' + key + '"' +
             ' aria-checked="' + (key === role) + '">' +
               '<span class="wcm-role__init" aria-hidden="true">' + r.init + '</span>' +
               '<span class="wcm-role__who">' +
                 '<span class="wcm-role__nm">' + r.name + '</span>' +
                 '<span class="wcm-role__rl">' + r.tag + '</span>' +
               '</span>' +
             '</button>';
    }).join('');
  }

  function setRole(key, quiet) {
    role = key;
    var r = ROLES[key];
    var trigger = $('#roleTrigger');
    trigger.textContent = r.init;
    trigger.setAttribute('aria-label', 'Viewing as ' + r.name + ', ' + r.tag.toLowerCase() + '. Change role.');
    trigger.setAttribute('title', r.name + ' · ' + r.tag);
    $('#curAvatar').textContent = r.init;
    $('#curRoleName').textContent = r.name;
    $('#curRoleTag').textContent = r.tag;
    renderRoleList();
    closePop('#roleMenu', '#roleTrigger');
    refreshRoleGates();
    if (!quiet) toast('Now signed in as ' + r.name + ', ' + r.tag.toLowerCase());
  }

  /* Segregation of duties. A control the current role may not use is
     disabled AND carries the reason as its accessible name, so the rule is
     legible rather than just an unexplained dead button. */
  function gate(el, reason) {
    if (!el) return;
    el.disabled = !!reason;
    if (reason) el.setAttribute('title', reason);
    else el.removeAttribute('title');
  }

  /* Two independent locks on Authorise, and the button says which one is
     holding it: the prerequisite (the callout's rule, which the original
     stated but did not enforce) and then segregation of duties. */
  var SOD = {
    iso:  'Segregation of duties: only the isolating authority (J. Müller) can certify this isolation.',
    rps:  'Segregation of duties: only the radiation protection supervisor (R. Voß) can issue this permit.',
    auth: 'Segregation of duties: only the authorising person (A. Kowalski) can authorise this permit.'
  };
  var STATE = { isoCertified: false, rwpIssued: false };

  function refreshRoleGates() {
    gate($('#isoCheck'), role === 'iso' ? null : SOD.iso);
    gate($('#rwpCheck'), role === 'rps' ? null : SOD.rps);
    gate($('#authbtn'),
         !STATE.isoCertified ? 'Isolation must be certified before this permit can be authorised.'
         : role !== 'auth'   ? SOD.auth : null);
    gate($('#authbtnRad'),
         !STATE.rwpIssued ? 'The radiation work permit must be issued before this permit can be authorised.'
         : role !== 'auth' ? SOD.auth : null);
  }

  /* ================================================================ views */
  var RAIL_FOR = { record: 'list', 'record-rad': 'list' };
  var view = 'home';

  function showView(name) {
    view = name;
    $$('.wcm-view').forEach(function (s) { s.hidden = s.dataset.view !== name; });
    $$('.wcm-head').forEach(function (s) { s.hidden = s.dataset.head !== name; });
    $$('.wcm-tools').forEach(function (s) { s.hidden = s.dataset.tools !== name; });
    var rail = RAIL_FOR[name] || name;
    $$('[data-rail]').forEach(function (b) {
      b.classList.toggle('praxis-navrail__btn--active', b.dataset.rail === rail);
    });
    var body = $('#content');
    if (body) body.scrollTop = 0;
    refreshRoleGates();
  }

  /* ================================================================= tabs */
  function selectTab(btn) {
    var strip = btn.closest('[role="tablist"]');
    $$('[role="tab"]', strip).forEach(function (t) {
      var on = t === btn;
      t.classList.toggle('admin-tab--active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var pane = t.getAttribute('aria-controls') && $('#' + t.getAttribute('aria-controls'));
      if (pane) pane.hidden = !on;
    });
  }
  function showTabById(id) {
    var btn = $('#' + id);
    if (btn) selectTab(btn);
  }

  /* =============================================================== chips */
  var TONE = {
    neutral: '', info: 'wcm-chip--info', success: 'wcm-chip--success',
    warning: 'wcm-chip--warning', danger: 'wcm-chip--danger'
  };
  function setChip(el, text, tone) {
    if (!el) return;
    el.className = 'wcm-chip' + (TONE[tone] ? ' ' + TONE[tone] : '');
    el.textContent = text;
  }
  function setStatus482(text, tone) {
    setChip($('#rowStatus482'), text, tone);
    setChip($('#hdrStatus482'), text, tone);
  }
  function setStatus459(text, tone) {
    setChip($('#rowStatus459'), text, tone);
    setChip($('#hdrStatus459'), text, tone);
  }

  /* ====================================================== workflow steps */
  var TICK = '<span class="material-symbols-rounded" aria-hidden="true">check</span>';
  function setStep(flow, step, state) {
    var el = $('#' + flow + ' [data-step="' + step + '"]');
    if (!el) return;
    if (state) el.dataset.state = state; else delete el.dataset.state;
    var dot = $('.wcm-flow__dot', el);
    dot.innerHTML = state === 'done' ? TICK : '';
  }

  /* ========================================================= audit trail */
  function logAudit(host, text) {
    var el = $('#' + host);
    if (!el) return;
    var row = document.createElement('div');
    row.className = 'admin-field';
    row.innerHTML = '<span class="admin-field__label" data-label-nocolon>Just now</span>' +
                    '<div class="admin-field__value">' + text + '</div>';
    el.appendChild(row);
  }

  /* ================================================ required-field counter */
  function completeRequired(pillId, popId, total) {
    var pill = $('#' + pillId);
    if (pill) {
      pill.innerHTML = '<span class="wcm-req__track"><span class="wcm-req__fill" style="width:100%"></span></span>' +
                       total + ' of ' + total + ' required fields' +
                       '<span class="material-symbols-rounded" aria-hidden="true">check</span>';
    }
    var pop = $('#' + popId);
    if (pop) pop.innerHTML = '<p>Nothing outstanding</p>';
  }

  /* =============================================================== toasts */
  function toast(msg) {
    var region = $('#toasts');
    /* Three at a time. The demo fires them in quick succession and an
       uncapped stack walked up over the content it was narrating. */
    while (region.children.length > 2) region.firstElementChild.remove();
    var t = document.createElement('div');
    t.className = 'wcm-toast';
    t.innerHTML = '<span class="wcm-toast__dot" aria-hidden="true"></span>' + msg;
    region.appendChild(t);
    setTimeout(function () { t.remove(); }, 5200);
  }

  /* ========================================================= popovers */
  function togglePop(popSel, trigSel) {
    var pop = $(popSel), trig = $(trigSel);
    var open = pop.hidden;
    pop.hidden = !open;
    if (trig) trig.setAttribute('aria-expanded', String(open));
  }
  function closePop(popSel, trigSel) {
    var pop = $(popSel), trig = $(trigSel);
    if (pop) pop.hidden = true;
    if (trig) trig.setAttribute('aria-expanded', 'false');
  }
  function closeAllPops() {
    closePop('#roleMenu', '#roleTrigger');
    closePop('#reqPop482', '#reqPill482');
    closePop('#reqPop459', '#reqPill459');
  }

  /* ============================================================== theme */
  function applyTheme(mode) {
    document.body.setAttribute('data-theme', mode);
    try { localStorage.setItem('gl-theme', mode); } catch (e) {}
    var sw = $('#themeSwitch');
    if (sw) sw.checked = mode === 'dark';
    var btn = $('#themeBtn');
    if (btn) btn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  function toggleTheme() {
    applyTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  /* ======================================================= notifications */
  var NOTIF = { permit482: 'active', deiso482: 'inactive', handback482: 'inactive' };
  var notifTab = 'action';

  function activeCount() {
    return Object.keys(NOTIF).filter(function (k) { return NOTIF[k] === 'active'; }).length;
  }
  function refreshNotifChrome() {
    var n = activeCount();
    var badge = $('#bellBadge');
    badge.hidden = n === 0;
    badge.textContent = String(n);
    var tile = $('#tileBadge');
    tile.hidden = n === 0;
    tile.textContent = String(n);
    var bell = $('#bellbtn');
    bell.setAttribute('aria-label', n ? 'Notifications, ' + n + ' need action' : 'Notifications');
  }
  function ncard(icon, title, desc, meta, act) {
    return '<button class="wcm-ncard" type="button" data-act="' + act + '">' +
             '<span class="wcm-ncard__icon" aria-hidden="true"><span class="material-symbols-rounded">' + icon + '</span></span>' +
             '<span>' +
               '<span class="wcm-ncard__title">' + title + '</span>' +
               '<span class="wcm-ncard__desc">' + desc + '</span>' +
               '<span class="wcm-ncard__time">' + meta + '</span>' +
             '</span>' +
           '</button>';
  }
  function renderNotifs(tab) {
    notifTab = tab || notifTab;
    $$('#notifTabs [role="tab"]').forEach(function (t) {
      var on = t.dataset.ntab === notifTab;
      t.classList.toggle('admin-tab--active', on);
      t.setAttribute('aria-selected', String(on));
    });
    var items = [];
    if (notifTab === 'all' || notifTab === 'action') {
      if (NOTIF.permit482 === 'active') {
        items.push(ncard('local_fire_department', 'Permit WCM-00482 needs your approval',
          'P206 hot work, boiler house bay 3. Isolation still needs certifying before you can authorise.',
          '2 hours ago &middot; M. Fischer', 'notif-permit'));
      }
      if (NOTIF.deiso482 === 'active') {
        items.push(ncard('lock', 'Isolation removal needed — WCM-00482',
          'Hot work is complete on site. Remove isolation IC-0097 and confirm there is no risk of re-energisation before hand-back.',
          'Just now &middot; T. Wright', 'notif-deiso'));
      }
      if (NOTIF.handback482 === 'active') {
        items.push(ncard('assignment', 'Hand-back review needed — WCM-00482',
          'Isolation removed. Review and sign the hand-back to close the permit and update SAP.',
          'Just now &middot; J. Müller', 'notif-handback'));
      }
    }
    $('#notifList').innerHTML = items.length
      ? items.join('')
      : '<p class="wcm-empty">Nothing here right now.</p>';
  }
  function openNotifs(tab) {
    renderNotifs(tab || 'action');
    $('#notifScrim').hidden = false;
    $('#notifDrawer').hidden = false;
    var first = $('#notifDrawer [data-act], #notifDrawer input');
    if (first) first.focus();
  }
  function closeNotifs() {
    $('#notifScrim').hidden = true;
    $('#notifDrawer').hidden = true;
  }

  /* ========================================================= new permit */
  function openPermitPicker() {
    $('#cnScrim').hidden = false;
    $('#cnFlyout').hidden = false;
    var first = $('#cnFlyout .cn-tpl');
    if (first) first.focus();
  }
  function closePermitPicker() {
    $('#cnScrim').hidden = true;
    $('#cnFlyout').hidden = true;
  }

  /* ========================================================== signature */
  var sigDone = null;
  var sigReady = false;

  function initSig() {
    var cv = $('#sigCanvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var drawing = false;
    function stroke() {
      ctx.strokeStyle = getComputedStyle(document.body)
        .getPropertyValue('--praxis-color-teal-70').trim() || '#146970';
      ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    }
    function pos(e) {
      var r = cv.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      return { x: (p.clientX - r.left) * (cv.width / r.width), y: (p.clientY - r.top) * (cv.height / r.height) };
    }
    function start(e) { drawing = true; stroke(); var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
    function move(e) {
      if (!drawing) return;
      var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
      sigReady = true; $('#sigConfirm').disabled = false;
      e.preventDefault();
    }
    function end() { drawing = false; }
    cv.addEventListener('mousedown', start);
    cv.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    cv.addEventListener('touchstart', start, { passive: false });
    cv.addEventListener('touchmove', move, { passive: false });
    cv.addEventListener('touchend', end);
  }
  function sigClear() {
    var cv = $('#sigCanvas');
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    sigReady = false;
    $('#sigConfirm').disabled = true;
  }
  function openSig(title, roleKey, done) {
    sigDone = done;
    $('#sigTitle').innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">draw</span> ' + title;
    var r = ROLES[roleKey];
    $('#sigWho').textContent = 'Signing as ' + r.name + ', ' + r.tag.toLowerCase() + '.';
    sigClear();
    $('#sigOverlay').hidden = false;
    $('#sigCanvas').focus();
  }
  function closeSig() {
    $('#sigOverlay').hidden = true;
    sigDone = null;
  }
  function sigConfirm() {
    var done = sigDone;
    closeSig();
    if (done) done();
  }
  function sigAutoDraw() {
    var cv = $('#sigCanvas');
    if (!cv || $('#sigOverlay').hidden) return;
    var ctx = cv.getContext('2d');
    ctx.strokeStyle = getComputedStyle(document.body)
      .getPropertyValue('--praxis-color-teal-70').trim() || '#146970';
    ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(40, 100);
    ctx.bezierCurveTo(80, 44, 124, 140, 168, 86);
    ctx.bezierCurveTo(212, 42, 246, 118, 292, 74);
    ctx.bezierCurveTo(326, 50, 358, 96, 392, 62);
    ctx.stroke();
    sigReady = true;
    $('#sigConfirm').disabled = false;
  }

  /* ============================================== permit 482 transitions */
  function certifyIsolation(on) {
    STATE.isoCertified = on;
    refreshRoleGates();
    $('#isoBanner').hidden = on;
    setStep('flow482', 'isolation', on ? 'done' : null);
    if (on) {
      setStatus482('Awaiting authorisation', 'info');
      completeRequired('reqPill482', 'reqPop482', 6);
      logAudit('audit482', 'Isolation certified and signed — J. Müller');
      toast('Isolation IC-0097 certified — signed by J. Müller');
    } else {
      setStatus482('Isolation pending', 'warning');
    }
  }
  function authorise() {
    setStep('flow482', 'authorised', 'done');
    setStep('flow482', 'live', 'active');
    setStatus482('Authorised', 'success');
    $('#kpiAwait').textContent = '0';
    $('#kpiAuth').textContent = String(parseInt($('#kpiAuth').textContent, 10) + 1);
    $('#isoCallout').hidden = true;
    logAudit('audit482', 'Authorised and signed — A. Kowalski');
    toast('Permit WCM-00482 authorised — the job is on the technician’s phone');
  }
  function deIsolate() {
    setStep('flow482', 'deiso', 'done');
    $('#deisoRow').hidden = true;
    $('#handbackRow').hidden = false;
    setStatus482('Pending hand-back', 'info');
    $('#sapStatus').textContent = 'DEISO — isolation removed, pending hand-back';
    NOTIF.deiso482 = 'done';
    NOTIF.handback482 = 'active';
    refreshNotifChrome();
    logAudit('audit482', 'Isolation removed and signed — J. Müller');
    toast('Isolation removed — signed by J. Müller');
  }
  function handBack() {
    setStep('flow482', 'closed', 'done');
    $('#handbackRow').hidden = true;
    setStatus482('Closed', 'neutral');
    var open = $('#kpiOpen');
    open.textContent = String(Math.max(0, parseInt(open.textContent, 10) - 1));
    $('#kpiIso').textContent = '0';
    $('#sapStatus').textContent = 'TECO — technically complete';
    NOTIF.handback482 = 'done';
    refreshNotifChrome();
    logAudit('audit482', 'Hand-back reviewed and signed — A. Kowalski');
    toast('Permit WCM-00482 closed — work order 4471029 marked complete in SAP');
  }

  /* ============================================== permit 459 transitions */
  function issueRwp(on) {
    STATE.rwpIssued = on;
    refreshRoleGates();
    $('#radBanner').hidden = on;
    setStep('flow459', 'rwp', on ? 'done' : null);
    if (on) {
      setStatus459('Awaiting authorisation', 'info');
      completeRequired('reqPill459', 'reqPop459', 5);
      logAudit('audit459', 'Radiation work permit issued and signed — R. Voß');
      toast('RWP-1142 issued — signed by R. Voß');
    } else {
      setStatus459('RWP pending', 'warning');
    }
  }
  function authoriseRad() {
    setStep('flow459', 'authorised', 'done');
    setStep('flow459', 'live', 'active');
    setStatus459('Authorised', 'success');
    logAudit('audit459', 'Authorised and signed — A. Kowalski');
    toast('Permit WCM-00459 authorised');
  }

  /* ==================================================== SAP work order */
  function pullFromSap() {
    var btn = $('#sapPullBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check</span> Pulled into work clearance management';
    }
    $('#sapStatus').textContent = 'REL — released to work clearance management';
    toast('Permit WCM-00482 created from SAP work order 4471029');
    showView('home');
  }

  /* ================================================== technician phone */
  function openPhone() {
    $('#phoneScrim').hidden = false;
    mShow('push');
  }
  function closePhone() { $('#phoneScrim').hidden = true; }
  function mShow(name) {
    $$('.wcm-mscreen').forEach(function (s) { s.hidden = s.dataset.mscreen !== name; });
  }
  function mCheckRefresh() {
    var brief = $$('#briefList input');
    $('#briefBtn').disabled = !brief.every(function (i) { return i.checked; });
    var iso = $$('#isoList input');
    $('#isoConfirmBtn').disabled = !iso.every(function (i) { return i.checked; });
  }
  function mCheckAll(listId) {
    $$('#' + listId + ' input').forEach(function (i) {
      i.checked = true;
      i.closest('.wcm-mchk').dataset.done = 'true';
    });
    mCheckRefresh();
  }
  function mCloseOut() {
    mShow('confirm');
    setStep('flow482', 'live', 'done');
    setStep('flow482', 'deiso', 'active');
    setStatus482('Pending de-isolation', 'warning');
    $('#sapStatus').textContent = 'CONF — work complete, pending de-isolation';
    $('#deisoRow').hidden = false;
    NOTIF.deiso482 = 'active';
    refreshNotifChrome();
    logAudit('audit482', 'Hot work completed on site — T. Wright');
    toast('Work complete on site — the isolation still has to be removed before this permit can close');
  }

  /* ================================================== action dispatcher */
  var ACTIONS = {
    'view': function (el) { showView(el.dataset.view); },
    'home': function () { showView('home'); },
    'theme': toggleTheme,
    'stub': function () { toast('Not wired up in this prototype.'); },
    'mazlan': function () { toast('Mazlan is a stub in this build — the drawer markup is not in the Praxis package yet.'); },
    'soon': function () { toast('This permit type is on the roadmap for a future configuration sprint.'); },

    'notifications': function (el) { openNotifs(el.dataset.tab); },
    'close-notifications': closeNotifs,
    'notif-permit': function () {
      NOTIF.permit482 = 'done';
      refreshNotifChrome();
      closeNotifs();
      showView('record');
      showTabById('tab482-details');
    },
    'notif-deiso': function () { closeNotifs(); showView('record'); showTabById('tab482-isolation'); },
    'notif-handback': function () { closeNotifs(); showView('record'); showTabById('tab482-isolation'); },

    'new-permit': openPermitPicker,
    'close-new-permit': closePermitPicker,
    'open-482': function () { closePermitPicker(); closeNotifs(); showView('record'); },
    'open-459': function () { closePermitPicker(); closeNotifs(); showView('record-rad'); },

    'sap-pull': pullFromSap,

    'set-role': function (el) { setRole(el.dataset.role); },

    'certify-isolation': function (el) {
      if (!el.checked) { certifyIsolation(false); return; }
      el.checked = false;
      openSig('Sign to certify isolation', 'iso', function () {
        el.checked = true;
        certifyIsolation(true);
      });
    },
    'authorise': function () {
      openSig('Sign to authorise this permit', 'auth', authorise);
    },
    'de-isolate': function () {
      if (role !== 'iso') {
        toast('Segregation of duties: only the isolating authority (J. Müller) can remove this isolation.');
        return;
      }
      openSig('Sign to confirm the isolation is removed', 'iso', deIsolate);
    },
    'hand-back': function () {
      if (role !== 'auth') {
        toast('Segregation of duties: the hand-back has to be reviewed and signed by the authorising person.');
        return;
      }
      openSig('Sign to confirm hand-back to operations', 'auth', handBack);
    },

    'issue-rwp': function (el) {
      if (!el.checked) { issueRwp(false); return; }
      el.checked = false;
      openSig('Sign to issue the radiation work permit', 'rps', function () {
        el.checked = true;
        issueRwp(true);
      });
    },
    'authorise-rad': function () {
      openSig('Sign to authorise this permit', 'auth', authoriseRad);
    },

    'sig-clear': sigClear,
    'sig-cancel': closeSig,
    'sig-confirm': function () { if (sigReady) sigConfirm(); },

    'phone': openPhone,
    'close-phone': closePhone,
    'm-show': function (el) { mShow(el.dataset.mscreen); },
    'm-check': function (el) {
      el.closest('.wcm-mchk').dataset.done = String(el.checked);
      mCheckRefresh();
    },
    'm-iso-confirm': function () {
      toast('Zero energy confirmed — work started at 09:52');
      mShow('active');
    },
    'm-close-out': mCloseOut,

    'begin-demo': function () { dismissStart(); setTimeout(dmStart, 350); },
    'begin-explore': function () {
      dismissStart();
      setTimeout(function () {
        toast('Explore freely — the play button in the top bar starts the guided tour any time.');
      }, 700);
    },
    'demo': dmStart,
    'dm-mute': dmMute,
    'dm-pause': dmPause,
    'dm-skip': dmSkip,
    'dm-exit': dmExit
  };

  document.addEventListener('click', function (e) {
    /* popover triggers */
    var trig = e.target.closest('#roleTrigger');
    if (trig) { e.preventDefault(); togglePop('#roleMenu', '#roleTrigger'); return; }
    var req = e.target.closest('.wcm-req__pill');
    if (req) {
      e.preventDefault();
      togglePop('#' + req.getAttribute('aria-controls'), '#' + req.id);
      return;
    }
    /* anything outside an open popover dismisses it, before the click is
       dispatched — otherwise a popover stays open behind the next screen */
    if (!e.target.closest('.px-pop')) closeAllPops();

    var tab = e.target.closest('.admin-tab[role="tab"]');
    if (tab) {
      e.preventDefault();
      if (tab.dataset.ntab) renderNotifs(tab.dataset.ntab);
      else selectTab(tab);
      return;
    }

    var el = e.target.closest('[data-act]');
    if (el) {
      var fn = ACTIONS[el.dataset.act];
      if (fn) {
        if (el.tagName === 'A') e.preventDefault();
        fn(el);
      }
      return;
    }

    /* scrim clicks dismiss their layer */
    if (e.target.id === 'notifScrim') closeNotifs();
    if (e.target.id === 'cnScrim') closePermitPicker();
    if (e.target.id === 'sigOverlay') closeSig();
    if (e.target.id === 'phoneScrim') closePhone();
  });

  /* checkbox state changes come through as change, not click, on some inputs */
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.type !== 'checkbox') return;
    var fn = ACTIONS[el.dataset.act];
    if (fn) fn(el);
  });
  $('#themeSwitch').addEventListener('change', function () {
    applyTheme(this.checked ? 'dark' : 'light');
  });

  /* keyboard: arrow keys move between tabs, Escape closes the top layer */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      var tab = e.target.closest('.admin-tab[role="tab"]');
      if (!tab) return;
      var tabs = $$('[role="tab"]', tab.closest('[role="tablist"]'));
      var next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      if (next.dataset.ntab) renderNotifs(next.dataset.ntab); else selectTab(next);
      next.focus();
      e.preventDefault();
      return;
    }
    if (e.key !== 'Escape') return;
    if (!$('#sigOverlay').hidden) { closeSig(); return; }
    if (!$('#phoneScrim').hidden) { closePhone(); return; }
    if (!$('#cnFlyout').hidden) { closePermitPicker(); return; }
    if (!$('#notifDrawer').hidden) { closeNotifs(); return; }
    if (!$('#roleMenu').hidden || !$('#reqPop482').hidden || !$('#reqPop459').hidden) { closeAllPops(); return; }
    if (DM.on) dmExit();
  });

  /* ===================================================== guided demo ==== */
  function resetDemoState() {
    setRole('planner', true);

    var isoChk = $('#isoCheck');
    if (isoChk) isoChk.checked = false;
    certifyIsolation(false);
    $('#reqPill482').innerHTML =
      '<span class="wcm-req__track"><span class="wcm-req__fill" style="width:83%"></span></span>' +
      '5 of 6 required fields<span class="material-symbols-rounded" aria-hidden="true">expand_more</span>';
    $('#reqPop482').innerHTML = '<p>Still outstanding</p><ul><li>Isolation certificate sign-off</li></ul>';

    ['isolation', 'live', 'deiso', 'closed'].forEach(function (s) { setStep('flow482', s, null); });
    setStep('flow482', 'authorised', 'active');

    var rwpChk = $('#rwpCheck');
    if (rwpChk) rwpChk.checked = false;
    issueRwp(false);
    $('#reqPill459').innerHTML =
      '<span class="wcm-req__track"><span class="wcm-req__fill" style="width:80%"></span></span>' +
      '4 of 5 required fields<span class="material-symbols-rounded" aria-hidden="true">expand_more</span>';
    $('#reqPop459').innerHTML = '<p>Still outstanding</p><ul><li>Radiation work permit sign-off</li></ul>';
    ['rwp', 'live'].forEach(function (s) { setStep('flow459', s, null); });
    setStep('flow459', 'authorised', 'active');

    $('#kpiOpen').textContent = '6';
    $('#kpiAwait').textContent = '1';
    $('#kpiAuth').textContent = '3';
    $('#kpiIso').textContent = '1';
    $('#isoCallout').hidden = false;

    NOTIF.permit482 = 'active';
    NOTIF.deiso482 = 'inactive';
    NOTIF.handback482 = 'inactive';
    refreshNotifChrome();

    closeNotifs(); closeSig(); closePermitPicker(); closePhone(); closeAllPops();

    var pull = $('#sapPullBtn');
    if (pull) {
      pull.disabled = false;
      pull.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">east</span> Pull into work clearance management';
    }
    $('#sapStatus').textContent = 'REL — released';

    $$('#briefList input, #isoList input').forEach(function (i) {
      i.checked = false;
      i.closest('.wcm-mchk').dataset.done = 'false';
    });
    mCheckRefresh();
    mShow('push');

    $('#deisoRow').hidden = true;
    $('#handbackRow').hidden = true;
    $('#audit482').innerHTML = '';
    $('#audit459').innerHTML = '';
    showTabById('tab482-details');
    showTabById('tab459-details');
    showView('sap');
  }

  var SCENES = [
    { t: 13000, title: 'It starts in SAP', spot: '#sapCard',
      say: 'Urenco already runs plant maintenance in SAP. Work order 4471029 is a corrective maintenance order on the boiler B2 relief valve, and it carries an EHS clearance flag — that is the trigger for a work clearance permit.',
      act: function () { showView('sap'); } },

    { t: 11000, title: 'Pulling it into work clearance', spot: '#sapPullBtn',
      say: 'Pulling that work order into work clearance management creates the permit automatically — asset, location and description carried straight across, so nobody re-keys it.',
      act: function () { pullFromSap(); } },

    { t: 11000, title: 'It lands on the home page', spot: '.wcm-tiles',
      say: 'That new permit lands as an action for Julia on the home page — the action required tile picks it up immediately, and the same badge shows on the notification bell.',
      act: function () { showView('home'); } },

    { t: 10000, title: 'Opening notifications', spot: '#bellbtn',
      say: 'Opening the bell shows exactly what needs attention.',
      act: function () { openNotifs('action'); } },

    { t: 11000, title: 'A permit needs approval', spot: '#notifList .wcm-ncard',
      say: 'Permit WCM-00482, a hot work permit for the boiler house, needs approval. Isolation still needs certifying before it can be authorised. Let us click into it.',
      act: function () {} },

    { t: 10000, title: 'Into the permit record', spot: '#sapSourceRow',
      say: 'That takes us into the permit record — and notice the source field is a live link straight back to the SAP work order, so there is a full audit trail from ERP to permit.',
      act: function () { ACTIONS['notif-permit'](); } },

    { t: 14000, title: 'Dashboard overview', spot: '.wcm-kpis',
      say: 'Stepping back to the dashboard: six permits are open, one is waiting on isolation certification before it can be authorised, and one isolation is currently live in pump room two.',
      act: function () { showView('dashboard'); } },

    { t: 13000, title: 'A simultaneous operations clash, visible up front', spot: '#simopsClash',
      say: 'The dashboard also tracks live activity by area. Area four’s scaffolding permit is running just twenty metres from the boiler house — the kind of overlap a safety officer needs to see before authorising anything nearby.',
      act: function () { showView('dashboard'); } },

    { t: 8000, title: 'Back into the permit queue', spot: '.admin-table-wrap',
      say: 'Let us go back into that permit and get it ready.',
      act: function () { showView('list'); } },

    { t: 8000, title: 'WCM-00482, a hot work permit', spot: '#flow482',
      say: 'WCM-00482 — a hot work permit for the boiler house, sitting at the authorisation step.',
      act: function () { showView('record'); } },

    { t: 12000, title: 'Checking the isolation status', spot: '[data-tabs="482"]',
      say: 'Switching to the isolation tab. This permit needs its energy isolation certified — lock and tag numbers, verified by the isolating authority — before it can move any further.',
      act: function () { showTabById('tab482-isolation'); } },

    { t: 12000, title: 'Signing to certify the isolation', spot: '#isoCheck',
      say: 'Switching to the isolating authority’s role to certify this isolation. Lock and tag numbers, verified on site, and signed — not just ticked in a box.',
      act: function () {
        setRole('iso', true);
        openSig('Sign to certify isolation', 'iso', function () {
          $('#isoCheck').checked = true;
          certifyIsolation(true);
        });
        setTimeout(sigAutoDraw, 900);
        setTimeout(sigConfirm, 2400);
      } },

    { t: 10000, title: 'Segregation of duties, enforced', spot: '#authbtn',
      say: 'Notice the authorise button is disabled — we are still signed in as the isolating authority. The system will not let that same login also authorise the permit it just certified. That is what stops a permit being self-issued.',
      act: function () {} },

    { t: 12000, title: 'Signing to authorise the permit', spot: '#authbtn',
      say: 'Switching to the authorising person unlocks it. They sign to authorise — advancing the workflow to live, and pushing the job to the technician’s phone.',
      act: function () {
        setRole('auth', true);
        openSig('Sign to authorise this permit', 'auth', authorise);
        setTimeout(sigAutoDraw, 900);
        setTimeout(sigConfirm, 2400);
      } },

    { t: 9000, title: 'The technician gets a push notification', spot: '.wcm-phone',
      say: 'On site, technician Tomasz Wright gets a push notification the moment the permit is authorised.',
      act: function () { openPhone(); mShow('push'); } },

    { t: 9000, title: 'Opening the worklist', spot: '.wcm-mitem--next',
      say: 'Opening his worklist, WCM-00482 is right at the top, ready to start.',
      act: function () { mShow('worklist'); } },

    { t: 10000, title: 'The technician view', spot: '#mPermitCard',
      say: 'The mobile view keeps it simple: what the job is, where, what is already isolated, and what protective equipment is required — no need to carry a paper permit pack.',
      act: function () { mShow('permit'); } },

    { t: 10000, title: 'Pre-job brief', spot: '#briefList',
      say: 'Before touching anything, he works through the pre-job brief — method statement, hazards, protective equipment, and confirming the fire watch is in position.',
      act: function () { mShow('brief'); } },

    { t: 9000, title: 'Brief acknowledged', spot: '#briefList',
      say: 'Once every item is reviewed, he acknowledges the brief and moves on to isolation.',
      act: function () { mCheckAll('briefList'); setTimeout(function () { mShow('iso'); }, 600); } },

    { t: 12000, title: 'Proving the isolation dead', spot: '#isoList',
      say: 'This is the safety-critical step: proving the isolation is actually dead on site, not just certified on paper. He checks the physical locks and tags, then tests each energy source in turn.',
      act: function () { mShow('iso'); } },

    { t: 10000, title: 'Every point verified', spot: '#isoConfirmBtn',
      say: 'With every point verified, the confirm button unlocks.',
      act: function () { mCheckAll('isoList'); } },

    { t: 9000, title: 'Zero energy confirmed, work starts', spot: '#fireWatch',
      say: 'Confirming zero energy starts the job — hot work, with a fire watch running for the duration.',
      act: function () { ACTIONS['m-iso-confirm'](); } },

    { t: 10000, title: 'Closing out on site', spot: '.wcm-mchecks',
      say: 'When the work is done, he completes the close-out: area made safe, tools cleared, fire watch stood down, notes added.',
      act: function () { mShow('close'); } },

    { t: 11000, title: 'Submitting the close-out', spot: '.wcm-mdone',
      say: 'Submitting the close-out finishes the technician’s part — but the permit is not closed yet. It flags that the isolation still needs to be formally removed before this can hand back to operations.',
      act: function () { mCloseOut(); } },

    { t: 10000, title: 'Back at the desk, a new action', spot: '#bellbtn',
      say: 'Back at her desk, a new action shows up: isolation removal needed for WCM-00482.',
      act: function () { closePhone(); showView('dashboard'); } },

    { t: 9000, title: 'Opening the removal notification', spot: '#notifList .wcm-ncard',
      say: 'Opening the bell shows it — the isolating authority still needs to remove the isolation before this can go any further.',
      act: function () { openNotifs('action'); } },

    { t: 13000, title: 'Removing the isolation, and signing', spot: '#deisoRow',
      say: 'Clicking through takes us to the isolation tab. The isolating authority removes the physical lock and tag, and signs to confirm the isolation is gone — that is the removal-of-energy step, closing the loop on the isolation itself.',
      act: function () {
        ACTIONS['notif-deiso']();
        setRole('iso', true);
        setTimeout(function () {
          openSig('Sign to confirm the isolation is removed', 'iso', deIsolate);
          setTimeout(sigAutoDraw, 700);
          setTimeout(sigConfirm, 2200);
        }, 500);
      } },

    { t: 13000, title: 'Hand-back, reviewed and signed', spot: '#handbackRow',
      say: 'Finally, the authorising person reviews and signs the hand-back to operations — a different person again, so nobody signs off their own work end to end. That closes the permit and marks the SAP work order complete.',
      act: function () {
        setRole('auth', true);
        openSig('Sign to confirm hand-back to operations', 'auth', handBack);
        setTimeout(sigAutoDraw, 700);
        setTimeout(sigConfirm, 2200);
      } },

    { t: 13000, title: 'Back on the dashboard, fully closed', spot: '.wcm-kpis',
      say: 'Back on the dashboard: the permit is closed, the isolation clears, and open permits drops by one — the same view a planner checks first thing every morning.',
      act: function () { showView('dashboard'); } },

    { t: 16000, title: 'The comprehensive loop', spot: null,
      say: 'SAP work order in, permit created, isolation certified and authorised by two different signed-in roles, executed safely on site, isolation formally removed, and handed back with a second signature before the permit closes and SAP updates. Segregation of duties, digital signatures, and a full audit trail at every handoff. That is a comprehensive work clearance management lifecycle for Urenco, end to end. Explore the rest of the prototype at your own pace.',
      act: function () { showView('dashboard'); } }
  ];

  var DM = { on: false, i: 0, timer: null, tick: null, paused: false, muted: false, elapsed: 0, voice: null };
  var DM_TOTAL = SCENES.reduce(function (a, s) { return a + s.t; }, 0);

  function pickVoice() {
    if (!window.speechSynthesis) return null;
    var v = speechSynthesis.getVoices();
    if (!v.length) return null;
    var pref = [/en-GB/i, /Google UK English Female/i, /Sonia/i, /Libby/i, /Daniel/i, /en-US/i, /en/i];
    for (var i = 0; i < pref.length; i++) {
      var m = v.find(function (x) { return pref[i].test(x.name) || pref[i].test(x.lang); });
      if (m) return m;
    }
    return v[0];
  }
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = function () { DM.voice = pickVoice(); };
  }

  function dmStart() {
    if (DM.on) return;
    resetDemoState();
    DM.on = true; DM.i = 0; DM.elapsed = 0; DM.paused = false; DM.muted = false;
    DM.voice = DM.voice || pickVoice();
    $('#dmb').classList.add('wcm-dmb--on');
    document.body.classList.add('wcm-demo-on');
    var title = $('#dmTitle');
    title.classList.add('wcm-dmtitle--on');
    dismissStart();
    DM.tick = setInterval(function () { if (!DM.paused) { DM.elapsed += 250; dmClock(); } }, 250);
    setTimeout(function () { title.classList.remove('wcm-dmtitle--on'); dmStep(); }, 2600);
  }

  function dmStep() {
    if (!DM.on) return;
    if (DM.i >= SCENES.length) return dmDone();
    var s = SCENES[DM.i];
    $('#dmbNum').textContent = DM.i + 1;
    $('#dmbScene').textContent = s.title;
    $('#dmbCap').textContent = s.say;
    dmSpot(null);
    try { s.act && s.act(); } catch (err) { console.warn('demo scene', DM.i, err); }
    if (s.spot) setTimeout(function () { dmSpot(s.spot); }, 700);

    var next = function () { if (!DM.on || DM.paused) return; DM.i++; dmStep(); };
    clearTimeout(DM.timer);
    if (DM.muted || !window.speechSynthesis) { DM.timer = setTimeout(next, s.t); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(s.say);
      if (DM.voice) u.voice = DM.voice;
      u.lang = (DM.voice && DM.voice.lang) || 'en-GB';
      u.rate = 1; u.pitch = 1; u.volume = 1;
      var done = false;
      u.onend = function () { if (done) return; done = true; setTimeout(next, 700); };
      u.onerror = function () { if (done) return; done = true; DM.timer = setTimeout(next, s.t); };
      speechSynthesis.speak(u);
      DM.timer = setTimeout(function () { if (done) return; done = true; next(); }, s.t + 9000);
    } catch (err) {
      DM.timer = setTimeout(next, s.t);
    }
  }

  function dmSpot(sel) {
    $$('.wcm-spot').forEach(function (e) { e.classList.remove('wcm-spot'); });
    if (!sel) return;
    var el = $(sel);
    if (el) el.classList.add('wcm-spot');
  }
  function mmss(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function dmClock() {
    $('#dmbProg').style.width = Math.min(100, (DM.elapsed / DM_TOTAL) * 100) + '%';
    $('#dmbTime').textContent = mmss(DM.elapsed) + ' / ' + mmss(DM_TOTAL);
  }
  function dmPause() {
    if (!DM.on) return;
    DM.paused = !DM.paused;
    var b = $('#dmbPause');
    b.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">' +
                  (DM.paused ? 'play_arrow' : 'pause') + '</span>';
    b.setAttribute('aria-label', DM.paused ? 'Resume demo' : 'Pause demo');
    if (window.speechSynthesis) {
      try { DM.paused ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (e) {}
    }
    if (DM.paused) clearTimeout(DM.timer);
    else if (DM.muted || !window.speechSynthesis) dmStep();
  }
  function dmMute() {
    DM.muted = !DM.muted;
    var b = $('#dmbMute');
    b.style.opacity = DM.muted ? '.4' : '.8';
    b.setAttribute('aria-label', DM.muted ? 'Unmute narration' : 'Mute narration');
    if (DM.muted && window.speechSynthesis) {
      try { speechSynthesis.cancel(); } catch (e) {}
      clearTimeout(DM.timer);
      if (!DM.paused) DM.timer = setTimeout(function () { DM.i++; dmStep(); }, 500);
    }
  }
  function dmSkip() {
    if (!DM.on) return;
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    clearTimeout(DM.timer);
    DM.paused = false;
    DM.elapsed = SCENES.slice(0, DM.i + 1).reduce(function (a, s) { return a + s.t; }, 0);
    DM.i++;
    dmStep();
  }
  function dmDone() {
    dmSpot(null);
    $('#dmbScene').textContent = 'Complete';
    $('#dmbCap').innerHTML = '<strong>End of demo.</strong> Explore freely, or replay from the top bar.';
    $('#dmbProg').style.width = '100%';
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    clearInterval(DM.tick);
    setTimeout(function () { if (DM.on) dmExit(); }, 6000);
  }
  function dmExit() {
    DM.on = false; DM.paused = false;
    clearTimeout(DM.timer); clearInterval(DM.tick);
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    dmSpot(null);
    $('#dmb').classList.remove('wcm-dmb--on');
    document.body.classList.remove('wcm-demo-on');
    $('#dmTitle').classList.remove('wcm-dmtitle--on');
  }
  function dismissStart() {
    var o = $('#startOv');
    if (o) o.classList.add('wcm-sov--gone');
    if (window.speechSynthesis) { try { DM.voice = DM.voice || pickVoice(); } catch (e) {} }
  }

  /* ==================================================== status filtering */
  function filterList(kind) {
    var rows = $$('#permitRows tr');
    var shown = 0;
    rows.forEach(function (r) {
      var on = kind === 'all' || r.dataset.status === kind;
      r.hidden = !on;
      /* Zebra striping is nth-child, which keeps counting rows that are
         display:none — the same trap praxis-rfield.css documents for a
         hidden empty-state row. Stripe the visible rows explicitly instead. */
      if (on) r.dataset.stripe = String(shown % 2);
      else r.removeAttribute('data-stripe');
      if (on) shown++;
    });
    $('#permitEmpty').hidden = shown !== 0;
    $('#listCount').textContent = shown === 1 ? '1 record' : shown + ' records';
    $$('#statusFilter .wcm-seg__btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filter === kind));
    });
  }
  $('#statusFilter').addEventListener('click', function (e) {
    var btn = e.target.closest('.wcm-seg__btn');
    if (btn) filterList(btn.dataset.filter);
  });

  /* ================================================================ boot */
  function boot() {
    var saved = 'light';
    try { saved = localStorage.getItem('gl-theme') || 'light'; } catch (e) {}
    applyTheme(saved);
    setRole('planner', true);
    refreshNotifChrome();
    renderNotifs('action');
    mCheckRefresh();
    initSig();
    showView('home');
    if (!window.speechSynthesis) {
      setTimeout(function () {
        toast('This browser has no speech synthesis, so the demo runs with captions only. Chrome or Edge gives you narration.');
      }, 1200);
    }
  }
  boot();
})();
