/* ============================================================================
   Praxis Mazlan drawer — shared component
   ============================================================================
   Right-side overlay opened from the app-bar Mazlan trigger ('.appbar__mazlan').
   Persona-aware suggestion cards + a chat surface with simulated Mazlan replies.

   This is a prototype surface, not a real LLM integration — the responses are
   canned and demo-friendly, scoped to demonstrate the interaction model.

   PER-PAGE CONFIG (optional): set window.MAZLAN_CONFIG before the drawer opens:
     window.MAZLAN_CONFIG = {
       greeting: 'Hi Marcus, what can I help you with today?',
       suggestions: [ { icon, cat, text, reply, action? }, ... ],
       scope: 'Global'
     };
   Config is read lazily on each open, so a host page can refresh it (e.g. on
   the trigger click) to keep the greeting + suggestions current. Missing keys
   fall back to a generic greeting and a small default suggestion set.

   The component references NO host-page globals directly. It uses window.announce
   when present, and optionally window.openAgentic / window.closeDetailPanel when
   those exist on the host page.
*/
(function () {
  'use strict';

  let mazlanDrawerOpen = false;
  let mazlanDrawerHasMessages = false;
  let mazlanPrevFocus = null;

  /* Category → icon tint color (matches Mazlan Builder palette). Generic. */
  const MAZLAN_CAT_COLORS = {
    Resume: 'teal',
    Create: 'pink',
    Search: 'blue',
    Workspace: 'purple',
    Reports: 'orange',
    Admin: 'green'
  };

  /* Fallback suggestions when window.MAZLAN_CONFIG.suggestions is absent. */
  const MAZLAN_DEFAULT_SUGGESTIONS = [
    { cat: 'Resume',  icon: 'play_circle', text: 'Pick Up Where I Left Off', reply: 'Resuming your most recent draft. Want me to open it, or summarize what\'s left?' },
    { cat: 'Create',  icon: 'note_add',    text: 'Start Something New',       reply: 'I can draft that for you — tell me what you need and I\'ll pre-fill the details.' },
    { cat: 'Search',  icon: 'search',      text: 'Find a Record',             reply: 'Tell me what you\'re looking for and I\'ll search across your records.' },
    { cat: 'Reports', icon: 'description', text: 'Brief Me on This Week',      reply: 'Here\'s a quick brief on this week\'s activity. Want me to go deeper on any item?' }
  ];

  const DEFAULT_GREETING = 'Hi, what can I help you with today?';

  /* ---- Host-safe helpers ------------------------------------------------ */
  function mzAnnounce(message) {
    if (typeof window.announce === 'function') window.announce(message);
  }
  function mzEscapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function mzTrigger() {
    return document.querySelector('.appbar__mazlan');
  }
  function mzGetSuggestions() {
    const c = window.MAZLAN_CONFIG;
    if (c && Array.isArray(c.suggestions) && c.suggestions.length) return c.suggestions;
    return MAZLAN_DEFAULT_SUGGESTIONS;
  }
  function mzGetGreeting() {
    const c = window.MAZLAN_CONFIG;
    return (c && c.greeting) ? c.greeting : DEFAULT_GREETING;
  }

  /* ---- Menu sub-drawer -------------------------------------------------- */
  function setMazlanMenuOpen(open) {
    const drawer = document.getElementById('mazlan-drawer');
    const menuBtn = document.getElementById('mazlan-menu-btn');
    if (!drawer) return;
    drawer.classList.toggle('mazlan-drawer--menu-open', !!open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const menu = document.getElementById('mazlan-menu');
    if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  /* ---- Open / close ----------------------------------------------------- */
  function openMazlanDrawer() {
    const drawer = document.getElementById('mazlan-drawer');
    const scrim = document.getElementById('mazlan-scrim');
    if (!drawer) return;
    /* Mutual exclusion — close the detail panel if the host page has one. */
    if (typeof window.closeDetailPanel === 'function') {
      const dd = document.getElementById('detail-drawer');
      if (dd && !dd.hidden) window.closeDetailPanel();
    }
    mazlanPrevFocus = document.activeElement;
    drawer.hidden = false;
    if (scrim) scrim.hidden = false;
    renderMazlanSuggestions();
    /* Greeting comes from the per-page config (falls back to a generic line). */
    const greetEl = document.getElementById('mazlan-welcome-greeting');
    if (greetEl) greetEl.textContent = mzGetGreeting();
    /* Animate in on next frame so the initial transform applies */
    requestAnimationFrame(() => {
      drawer.classList.add('mazlan-drawer--open');
      if (scrim) scrim.classList.add('mazlan-scrim--open');
    });
    mazlanDrawerOpen = true;
    mzTrigger()?.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.getElementById('mazlan-drawer-textarea')?.focus(), 100);
    mzAnnounce('Mazlan opened');
  }

  function closeMazlanDrawer() {
    const drawer = document.getElementById('mazlan-drawer');
    const scrim = document.getElementById('mazlan-scrim');
    if (!drawer) return;
    drawer.classList.remove('mazlan-drawer--open');
    if (scrim) scrim.classList.remove('mazlan-scrim--open');
    /* Wait for the slide-out before hiding from layout */
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = isReducedMotion ? 0 : 250;
    setTimeout(() => {
      drawer.hidden = true;
      if (scrim) scrim.hidden = true;
    }, delay);
    mazlanDrawerOpen = false;
    mzTrigger()?.setAttribute('aria-expanded', 'false');
    if (mazlanPrevFocus && mazlanPrevFocus.focus) mazlanPrevFocus.focus();
  }

  /* ---- Suggestions ------------------------------------------------------ */
  function renderMazlanSuggestions() {
    /* Suggestions are hidden as soon as the user starts a conversation OR
       begins typing in the input. They live in the footer above the input. */
    const sec = document.getElementById('mazlan-suggestions');
    if (!sec) return;
    if (mazlanDrawerHasMessages) { sec.hidden = true; return; }
    sec.hidden = false;
    /* Header row (label + shuffle + "See all assistants"), built once above
       the card grid — mirrors the prototype's .welcome-view-all row. */
    if (!sec.querySelector('.mazlan-suggestions__head')) {
      const head = document.createElement('div');
      head.className = 'mazlan-suggestions__head';
      head.innerHTML =
        '<span class="mazlan-suggestions__label">A few ways I can help</span>' +
        '<button class="mazlan-suggestions__shuffle" type="button" aria-label="Show other options" title="Shuffle"><span class="material-symbols-rounded">shuffle</span></button>' +
        '<button class="mazlan-suggestions__seeall" type="button">See all assistants<span class="material-symbols-rounded">chevron_right</span></button>';
      sec.insertBefore(head, sec.firstChild);
      head.querySelector('.mazlan-suggestions__shuffle').addEventListener('click', function () {
        const btn = head.querySelector('.mazlan-suggestions__shuffle');
        btn.classList.remove('is-spinning'); void btn.offsetWidth; btn.classList.add('is-spinning');
        const g = document.getElementById('mazlan-suggestions-grid');
        if (g) Array.prototype.slice.call(g.children).sort(function () { return Math.random() - 0.5; }).forEach(function (c) { g.appendChild(c); });
      });
      head.querySelector('.mazlan-suggestions__seeall').addEventListener('click', function () {
        const mb = document.getElementById('mazlan-menu-btn'); if (mb) mb.click();
      });
    }
    const grid = document.getElementById('mazlan-suggestions-grid');
    if (!grid) return;
    const suggestions = mzGetSuggestions();
    grid.innerHTML = suggestions.map((s, i) => {
      const tint = MAZLAN_CAT_COLORS[s.cat] || 'teal';
      return `
        <button class="mazlan-sugg" type="button" data-sugg-idx="${i}">
          <span class="mazlan-sugg__icon mazlan-sugg__icon--${tint}" aria-hidden="true">
            <span class="material-symbols-rounded">${s.icon}</span>
          </span>
          <span class="mazlan-sugg__title">${mzEscapeHtml(s.text)}</span>
        </button>
      `;
    }).join('');
    grid.querySelectorAll('[data-sugg-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.suggIdx);
        handleMazlanSuggestion(suggestions[idx]);
      });
    });
  }

  /* Show/hide the suggestion grid based on textarea content. Once the user
     starts typing, the grid vanishes; if they clear the textarea (and haven't
     sent anything yet), it returns. */
  function updateMazlanSuggestionsForTyping() {
    if (mazlanDrawerHasMessages) return;  /* already hidden permanently */
    const textarea = document.getElementById('mazlan-drawer-textarea');
    const sec = document.getElementById('mazlan-suggestions');
    if (!textarea || !sec) return;
    sec.hidden = textarea.value.trim().length > 0;
  }

  /* Single primary button — icon transforms between mic (voice) and send
     (submit) based on textarea content. Same button identity throughout. */
  function updateMazlanSendButton() {
    const textarea = document.getElementById('mazlan-drawer-textarea');
    const btn = document.getElementById('mazlan-primary-btn');
    const icon = document.getElementById('mazlan-primary-icon');
    if (!textarea || !btn || !icon) return;
    const hasText = textarea.value.trim().length > 0;
    icon.textContent = hasText ? 'send' : 'mic';
    btn.setAttribute('aria-label', hasText ? 'Send message' : 'Voice to text');
    btn.dataset.mode = hasText ? 'send' : 'voice';
  }

  function handleMazlanSuggestion(sugg) {
    /* Treat a suggestion click as if the user sent that message, with the
       pre-canned Mazlan reply queued up. */
    appendMazlanMessage('user', sugg.text);
    /* Some suggestions offer an action that kicks off a full agentic task.
       The reply presents the action — the user decides when to start it. */
    let actions = null;
    if (sugg.action === 'agentic-boeing') {
      actions = [{ label: 'Start audit-prep', icon: 'arrow_forward', primary: true, act: 'agentic-boeing' }];
    } else if (sugg.cat === 'Workspace') {
      actions = [{ label: 'Apply', icon: 'check', primary: true }, { label: 'Cancel', icon: 'close' }];
    }
    appendMazlanMessage('mazlan', sugg.reply, { actions });
  }

  /* Canned demo scaffolding for the bot response anatomy (reasoning timeline,
     sources, follow-ups) — a live integration would supply these per turn. */
  const MZ_STEPS = [
    { text: 'Understood your question', dur: '0.4s' },
    { text: 'Searched your records and connected sources', dur: '1.2s' },
    { text: 'Cross-checked the SDS + policy library', dur: '0.9s' },
    { text: 'Composed the answer', dur: '0.6s' }
  ];
  const MZ_SOURCES = [
    { title: 'ISO 45001:2018 — Occupational Health & Safety', origin: 'iso.org/standard/63787', badge: 'IS' },
    { title: 'NIOSH Hierarchy of Controls', origin: 'cdc.gov/niosh', badge: 'NI' },
    { title: 'WI123 — Risk Assessment Techniques', origin: 'Work instruction', badge: 'WI' }
  ];
  const MZ_FOLLOWUPS = ['Draft a CAPA for this', 'Show me the related records', 'Summarise the key actions'];

  function mzFourDot() {
    return '<span class="mazlan-mark mazlan-mark--sm" aria-hidden="true"><span></span><span></span><span></span><span></span></span>';
  }

  function appendMazlanMessage(role, text, opts) {
    opts = opts || {};
    const thread = document.getElementById('mazlan-thread');
    if (!thread) return;
    /* Once a real message exists, retire the suggestion grid + welcome and
       flip the drawer into its in-chat state (hides the dot grid, morphs the
       header — see .mazlan-drawer--in-chat). */
    if (!mazlanDrawerHasMessages) {
      mazlanDrawerHasMessages = true;
      const sugg = document.getElementById('mazlan-suggestions');
      if (sugg) sugg.hidden = true;
      const welcome = document.getElementById('mazlan-welcome');
      if (welcome) welcome.setAttribute('aria-hidden', 'true');
      const drawer = document.getElementById('mazlan-drawer');
      if (drawer) drawer.classList.add('mazlan-drawer--in-chat');
      /* Header morphs to the conversation summary + options + content panel. */
      mzSetupChatHeader(role === 'user' ? text : 'New conversation');
    }
    const msg = document.createElement('div');
    msg.className = `mazlan-msg mazlan-msg--${role}`;
    if (role === 'user') {
      /* User turn — a slate bubble with white text, no "You" label. */
      msg.innerHTML = `<div class="mazlan-msg__bubble">${renderMazlanMarkdown(text)}</div>`;
    } else {
      buildMazlanBotMessage(msg, text, opts);
    }
    thread.appendChild(msg);
    const body = document.getElementById('mazlan-drawer-body');
    if (body) body.scrollTop = body.scrollHeight;
    return msg;
  }

  /* Bot turn anatomy (copied from the v3 prototype):
       reasoning header (mark + chevron + summary + timer) → expandable
       timeline · container-less response text · expandable sources ·
       follow-up pills · action tools (copy / thumbs up / thumbs down). */
  function buildMazlanBotMessage(msg, text, opts) {
    const steps = opts.steps || MZ_STEPS;
    const sources = opts.sources || MZ_SOURCES;
    const followups = opts.followups || MZ_FOLLOWUPS;
    const timer = opts.timer || '1.8s';
    const summary = opts.summary || `Analysed your request across ${sources.length} sources`;
    const actions = opts.actions;

    const stepsHtml = steps.map((s, i) => `
      <div class="mazlan-reasoning__step">
        <span class="mazlan-reasoning__dot"></span>
        <span class="mazlan-reasoning__step-text">${mzEscapeHtml(s.text)}</span>
        ${s.dur ? `<span class="mazlan-reasoning__dur">${mzEscapeHtml(s.dur)}</span>` : ''}
      </div>`).join('');

    const avatarsHtml = sources.map(s => `<span class="mazlan-source__avatar">${mzEscapeHtml(s.badge || '?')}</span>`).join('');
    const sourceItemsHtml = sources.map(s => `
      <button class="mazlan-source__item" type="button">
        <span class="mazlan-source__avatar">${mzEscapeHtml(s.badge || '?')}</span>
        <span class="mazlan-source__text">
          <span class="mazlan-source__title">${mzEscapeHtml(s.title)}</span>
          <span class="mazlan-source__origin">${mzEscapeHtml(s.origin)}</span>
        </span>
        <span class="material-symbols-rounded mazlan-source__arrow">chevron_right</span>
      </button>`).join('');

    msg.innerHTML = `
      <div class="mazlan-reasoning">
        <button class="mazlan-reasoning__header" type="button" aria-expanded="false">
          <span class="mazlan-reasoning__logo">${mzFourDot()}</span>
          <span class="material-symbols-rounded mazlan-reasoning__chev">chevron_right</span>
          <span class="mazlan-reasoning__summary">${mzEscapeHtml(summary)}</span>
          <span class="mazlan-reasoning__timer">${mzEscapeHtml(timer)}</span>
        </button>
        <div class="mazlan-reasoning__timeline"><div>${stepsHtml}</div></div>
      </div>
      <div class="mazlan-msg__text">${renderMazlanMarkdown(text)}</div>
      ${actions ? `<div class="mazlan-msg__actions">${actions.map(a => `
        <button class="mazlan-msg__action" type="button">
          <span class="material-symbols-rounded">${a.icon}</span>${mzEscapeHtml(a.label)}
        </button>`).join('')}</div>` : ''}
      <div class="mazlan-sources">
        <button class="mazlan-sources__toggle" type="button" aria-expanded="false">
          <span class="material-symbols-rounded mazlan-sources__chev">chevron_right</span>
          <span class="mazlan-sources__avatars">${avatarsHtml}</span>
          <span class="mazlan-sources__label">${sources.length} sources</span>
        </button>
        <div class="mazlan-sources__list"><div>${sourceItemsHtml}</div></div>
      </div>
      ${followups.length ? `<div class="mazlan-followups">${followups.map(f => `
        <button class="mazlan-followup" type="button"><span>${mzEscapeHtml(f)}</span></button>`).join('')}</div>` : ''}
      <div class="mazlan-msg__tools">
        <button class="mazlan-msg__tool" type="button" aria-label="Copy" title="Copy"><span class="material-symbols-rounded">content_copy</span></button>
        <button class="mazlan-msg__tool" type="button" aria-label="Good response" title="Good response"><span class="material-symbols-rounded">thumb_up</span></button>
        <button class="mazlan-msg__tool" type="button" aria-label="Bad response" title="Bad response"><span class="material-symbols-rounded">thumb_down</span></button>
      </div>`;

    /* Reasoning + sources are collapsible (grid-rows 0fr↔1fr like the prototype). */
    const rHeader = msg.querySelector('.mazlan-reasoning__header');
    const rWrap = msg.querySelector('.mazlan-reasoning');
    rHeader.addEventListener('click', () => {
      const open = rWrap.classList.toggle('mazlan-reasoning--open');
      rHeader.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    const sToggle = msg.querySelector('.mazlan-sources__toggle');
    const sWrap = msg.querySelector('.mazlan-sources');
    sToggle.addEventListener('click', () => {
      const open = sWrap.classList.toggle('mazlan-sources--open');
      sToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    /* Follow-up pills send themselves as the next user turn. */
    msg.querySelectorAll('.mazlan-followup').forEach(btn => {
      btn.addEventListener('click', () => handleMazlanSuggestion({ text: btn.textContent.trim(), reply: 'Here’s what I found on that.' }));
    });
    /* Copy tool copies the response text. */
    const copyBtn = msg.querySelector('.mazlan-msg__tool');
    copyBtn.addEventListener('click', () => {
      const t = msg.querySelector('.mazlan-msg__text');
      if (t && navigator.clipboard) navigator.clipboard.writeText(t.innerText).catch(() => {});
      mzAnnounce('Copied');
    });
    /* Wire any inline agentic action (e.g. Start audit-prep). */
    if (actions) {
      msg.querySelectorAll('.mazlan-msg__action').forEach((btn, i) => {
        const a = actions[i];
        if (a && a.act === 'agentic-boeing' && typeof window.openAgentic === 'function') {
          btn.addEventListener('click', () => { closeMazlanDrawer(); window.openAgentic(); });
        }
      });
    }
  }

  /* Minimal markdown — only **bold** is supported in the demo replies. Escaped first. */
  function renderMazlanMarkdown(text) {
    const escaped = mzEscapeHtml(text);
    return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function showMazlanTyping() {
    const thread = document.getElementById('mazlan-thread');
    if (!thread) return;
    const typing = document.createElement('div');
    typing.id = 'mazlan-typing';
    typing.className = 'mazlan-msg mazlan-msg--mazlan';
    typing.innerHTML = `
      <span class="mazlan-msg__who">Mazlan</span>
      <div class="mazlan-typing" aria-label="Mazlan is thinking">
        <span class="mazlan-typing__dot"></span>
        <span class="mazlan-typing__dot"></span>
        <span class="mazlan-typing__dot"></span>
      </div>
    `;
    thread.appendChild(typing);
    const body = document.getElementById('mazlan-drawer-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  function hideMazlanTyping() {
    document.getElementById('mazlan-typing')?.remove();
  }

  function handleMazlanSubmit(e) {
    e.preventDefault();
    const textarea = document.getElementById('mazlan-drawer-textarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;
    appendMazlanMessage('user', text);
    textarea.value = '';
    textarea.style.height = '';
    /* Canned generic reply — a real integration would route to the agent. */
    appendMazlanMessage('mazlan', `Working on **"${text}"** — I'd look across your records, draft what's needed, and bring it back for you to confirm. (Prototype response — the live integration would route this to the agent.)`);
  }

  /* ---- Stage 5: in-chat header (summary + options + content panel) ------ */
  function mzContentItems() {
    /* Canned "content in this chat" — a live integration would list the
       artifacts Mazlan produced + documents the user attached. */
    const items = [
      { icon: 'description', title: 'Audit-prep evidence pack', meta: 'Draft · generated just now' },
      { icon: 'fact_check', title: 'FAS-2026-0418 finding', meta: 'Record · linked' },
      { icon: 'menu_book', title: 'ISO 45001:2018 — clause 6 excerpt', meta: 'Reference · added' }
    ];
    return items.map(i => `
      <button class="mazlan-content__item" type="button">
        <span class="mazlan-content__icon"><span class="material-symbols-rounded">${i.icon}</span></span>
        <span class="mazlan-content__text">
          <span class="mazlan-content__item-title">${mzEscapeHtml(i.title)}</span>
          <span class="mazlan-content__meta">${mzEscapeHtml(i.meta)}</span>
        </span>
      </button>`).join('');
  }

  function mzResetChat() {
    const thread = document.getElementById('mazlan-thread');
    if (thread) thread.innerHTML = '';
    mazlanDrawerHasMessages = false;
    const drawer = document.getElementById('mazlan-drawer');
    if (drawer) drawer.classList.remove('mazlan-drawer--in-chat', 'mazlan-drawer--content-open');
    const more = document.getElementById('mazlan-more');
    if (more) more.hidden = true;
    const welcome = document.getElementById('mazlan-welcome');
    if (welcome) welcome.setAttribute('aria-hidden', 'false');
    const sec = document.getElementById('mazlan-suggestions');
    if (sec) sec.hidden = false;
    renderMazlanSuggestions();
    const title = document.getElementById('mazlan-drawer-title');
    if (title) { title.textContent = ''; title.classList.remove('mazlan-drawer__title--convo'); }
  }

  function mzRenameChat() {
    const title = document.getElementById('mazlan-drawer-title');
    if (!title) return;
    title.setAttribute('contenteditable', 'true');
    title.classList.add('mazlan-drawer__title--editing');
    title.focus();
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.selectAllChildren) sel.selectAllChildren(title);
    const done = () => {
      title.removeAttribute('contenteditable');
      title.classList.remove('mazlan-drawer__title--editing');
      title.textContent = (title.textContent || '').trim() || 'New conversation';
      title.removeEventListener('blur', done);
      title.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); title.blur(); }
      else if (e.key === 'Escape') { title.blur(); }
    };
    title.addEventListener('blur', done);
    title.addEventListener('keydown', onKey);
  }

  /* Inject the in-chat header controls + content panel once, then set the
     conversation summary. Kept in JS so the shared markup stays untouched. */
  function mzSetupChatHeader(summary) {
    const drawer = document.getElementById('mazlan-drawer');
    if (!drawer) return;
    const title = document.getElementById('mazlan-drawer-title');
    if (title && !title.classList.contains('mazlan-drawer__title--editing')) {
      title.textContent = summary;
      title.classList.add('mazlan-drawer__title--convo');
    }
    if (drawer.querySelector('#mazlan-chat-options')) return;  /* inject once */
    const actions = drawer.querySelector('.mazlan-drawer__head-actions');
    if (!actions) return;

    const optWrap = document.createElement('div');
    optWrap.className = 'mazlan-more-wrap mazlan-chat-only';
    optWrap.innerHTML =
      '<button class="mazlan-drawer__head-btn" id="mazlan-chat-options" type="button" aria-label="Chat options" aria-haspopup="menu" aria-expanded="false"><span class="material-symbols-rounded">more_vert</span></button>' +
      '<div class="mazlan-more" id="mazlan-more" role="menu" hidden>' +
        '<button class="mazlan-more__item" type="button" role="menuitem" data-more="rename"><span class="material-symbols-rounded">edit</span>Rename</button>' +
        '<button class="mazlan-more__item" type="button" role="menuitem" data-more="newchat"><span class="material-symbols-rounded">add</span>New chat</button>' +
        '<button class="mazlan-more__item" type="button" role="menuitem" data-more="memory"><span class="material-symbols-rounded">psychology</span>Memory</button>' +
        '<div class="mazlan-more__divider"></div>' +
        '<button class="mazlan-more__item mazlan-more__item--danger" type="button" role="menuitem" data-more="delete"><span class="material-symbols-rounded">delete</span>Delete</button>' +
      '</div>';

    const contentBtn = document.createElement('button');
    contentBtn.className = 'mazlan-drawer__head-btn mazlan-chat-only';
    contentBtn.id = 'mazlan-content-btn';
    contentBtn.type = 'button';
    contentBtn.setAttribute('aria-label', 'Content in this chat');
    contentBtn.innerHTML = '<span class="material-symbols-rounded">right_panel_open</span>';

    actions.insertBefore(contentBtn, actions.firstChild);
    actions.insertBefore(optWrap, actions.firstChild);

    const panel = document.createElement('aside');
    panel.className = 'mazlan-content';
    panel.id = 'mazlan-content';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<header class="mazlan-content__head">' +
        '<span class="mazlan-content__title">Content in this chat</span>' +
        '<button class="mazlan-drawer__head-btn" id="mazlan-content-close" type="button" aria-label="Close"><span class="material-symbols-rounded">close</span></button>' +
      '</header>' +
      '<div class="mazlan-content__body">' + mzContentItems() + '</div>';
    drawer.appendChild(panel);

    /* ⋮ dropdown */
    const optBtn = optWrap.querySelector('#mazlan-chat-options');
    const more = optWrap.querySelector('#mazlan-more');
    const closeMore = () => { more.hidden = true; optBtn.setAttribute('aria-expanded', 'false'); };
    optBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = more.hidden;
      more.hidden = !open;
      optBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => { if (!optWrap.contains(e.target)) closeMore(); });
    more.querySelectorAll('[data-more]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.more;
        closeMore();
        if (act === 'rename') mzRenameChat();
        else if (act === 'newchat' || act === 'delete') mzResetChat();
        else if (act === 'memory') mzAnnounce('Conversation memory is on for this chat (prototype).');
      });
    });

    /* Content panel toggle */
    const toggleContent = (open) => {
      drawer.classList.toggle('mazlan-drawer--content-open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      contentBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    contentBtn.addEventListener('click', () => toggleContent(!drawer.classList.contains('mazlan-drawer--content-open')));
    panel.querySelector('#mazlan-content-close').addEventListener('click', () => toggleContent(false));
  }

  /* Auto-grow the textarea up to its max-height, then it scrolls. */
  function autoGrowMazlanTextarea() {
    const t = document.getElementById('mazlan-drawer-textarea');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 140) + 'px';
  }

  function wireMazlanDrawerControls() {
    const drawer = document.getElementById('mazlan-drawer');
    if (!drawer) return;  /* no drawer on this page — nothing to wire */

    mzTrigger()?.addEventListener('click', () => {
      mazlanDrawerOpen ? closeMazlanDrawer() : openMazlanDrawer();
    });
    document.getElementById('mazlan-drawer-close')?.addEventListener('click', closeMazlanDrawer);
    document.getElementById('mazlan-scrim')?.addEventListener('click', closeMazlanDrawer);
    /* Menu open / close */
    document.getElementById('mazlan-menu-btn')?.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('mazlan-drawer--menu-open');
      setMazlanMenuOpen(!isOpen);
    });
    document.getElementById('mazlan-menu-close')?.addEventListener('click', () => setMazlanMenuOpen(false));
    /* Menu item clicks — placeholder for prototype */
    document.querySelectorAll('[data-menu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset.menu;
        const labels = { newchat: 'New chat', chats: 'Chats', library: 'Library', explore: 'Explore', settings: 'Settings' };
        mzAnnounce(`${labels[item] || 'Menu'} (prototype placeholder)`);
        if (item === 'newchat') mzResetChat();
        setMazlanMenuOpen(false);
      });
    });
    /* Pinned + Recents section toggles */
    document.querySelectorAll('.mazlan-menu__section-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        const list = btn.nextElementSibling;
        if (list) list.style.display = expanded ? 'none' : '';
      });
    });
    document.getElementById('mazlan-drawer-form')?.addEventListener('submit', handleMazlanSubmit);

    /* Enter to send, Shift+Enter for newline. Input event drives suggestion
       visibility, send-button enabled state, and textarea auto-grow. */
    const textarea = document.getElementById('mazlan-drawer-textarea');
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (textarea.value.trim().length === 0) return;
          handleMazlanSubmit(e);
        }
      });
      textarea.addEventListener('input', () => {
        autoGrowMazlanTextarea();
        updateMazlanSendButton();
        updateMazlanSuggestionsForTyping();
      });
    }

    /* Toolbar buttons — placeholder handlers. */
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        const labels = {
          attach:   'Attach file or photo (prototype placeholder)',
          photo:    'Take photo (prototype placeholder)',
          record:   'Record a clip (prototype placeholder)',
          dictate:  'Voice-to-text dictation (prototype placeholder)',
          voice:    'Voice input mode (prototype placeholder)'
        };
        mzAnnounce(labels[tool] || 'Tool clicked');
        /* Close the plus dropdown after a menu item is chosen */
        if (['attach', 'photo', 'record'].includes(tool)) {
          const dd = document.getElementById('mazlan-plus-dropdown');
          const btnEl = document.getElementById('mazlan-plus-btn');
          if (dd) dd.hidden = true;
          if (btnEl) btnEl.setAttribute('aria-expanded', 'false');
        }
      });
    });
    /* + plus button — opens the attachment dropdown */
    const plusBtn = document.getElementById('mazlan-plus-btn');
    const plusDd  = document.getElementById('mazlan-plus-dropdown');
    if (plusBtn && plusDd) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !plusDd.hidden;
        plusDd.hidden = isOpen;
        plusBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
      document.addEventListener('click', (e) => {
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        if (path.includes(plusBtn) || path.includes(plusDd)) return;
        plusDd.hidden = true;
        plusBtn.setAttribute('aria-expanded', 'false');
      });
    }
    /* Scope picker — placeholder (would open a scope dropdown in production) */
    const scopeBtn = document.getElementById('mazlan-scope-btn');
    if (scopeBtn) {
      scopeBtn.addEventListener('click', () => {
        mzAnnounce('Scope picker (prototype placeholder)');
      });
    }
    /* Primary button — sends when textarea has text, otherwise starts voice input. */
    const primaryBtn = document.getElementById('mazlan-primary-btn');
    if (primaryBtn) {
      primaryBtn.addEventListener('click', (e) => {
        if (primaryBtn.dataset.mode === 'send') {
          handleMazlanSubmit(e);
        } else {
          mzAnnounce('Voice input (prototype placeholder)');
        }
      });
    }

    /* "Open full" — the full-page Mazlan experience lives in an adjacent project.
       This is a placeholder that just announces; swap to a real href when the
       adjacent project ships. */
    document.getElementById('mazlan-open-full')?.addEventListener('click', () => {
      mzAnnounce('Opening the full Mazlan experience — this links to the adjacent project when it ships.');
    });

    /* Esc closes the drawer */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mazlanDrawerOpen) {
        e.preventDefault();
        closeMazlanDrawer();
      }
    });
  }

  /* Self-initialize once the DOM is ready. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireMazlanDrawerControls);
  } else {
    wireMazlanDrawerControls();
  }

  /* Expose the open/close API for host pages that want to trigger it directly. */
  window.openMazlanDrawer = openMazlanDrawer;
  window.closeMazlanDrawer = closeMazlanDrawer;
})();
