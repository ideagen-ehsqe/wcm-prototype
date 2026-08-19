/* praxis-lucide.js
 * Runtime converter: renders every Material Symbols icon
 * (<span class="material-symbols-rounded">LIGATURE</span>, inline or produced
 * by JS template strings) as a Lucide outline SVG, with zero edits to the
 * ~500 icon call sites.
 *
 * Load with a single tag before </body>:
 *   <script src="praxis-lucide.js"></script>
 *
 * How it works:
 *  1. Loads vendor/lucide.min.js (relative to /prototype/); falls back to CDN.
 *  2. Injects sizing CSS so the generated 1em SVGs inherit the existing
 *     `.material-symbols-rounded { font-size: Npx }` rules and currentColor.
 *  3. convert() maps each ligature -> data-lucide, clears the text, then calls
 *     lucide.createIcons(). Lucide copies the element classes onto the SVG, so
 *     `.material-symbols-rounded` still sizes/colors them.
 *  4. Runs on DOMContentLoaded (or immediately) and via a debounced
 *     MutationObserver so dynamically-rendered icons convert automatically.
 *  5. The four-dot .mazlan-mark logo is never touched (not a MS element).
 */
(function () {
  'use strict';

  /* ---- Material Symbols ligature -> Lucide icon (kebab-case) ---- */
  var MAT2LUCIDE = {
    // navigation / chrome
    "search":"search","close":"x","clear":"x","menu":"menu","settings":"settings",
    // home dashboard (index.html): component-header icons
    "arrow_circle_right":"circle-arrow-right",
    "assignment":"clipboard-list","lab_profile":"file-chart-column","stacked_line_chart":"chart-area",
    // filter system (praxis-filters.js): field-type icons + panel affordances
    "notes":"text","list":"list","instant_mix":"sliders-horizontal","drag_indicator":"grip-vertical",
    "check":"check","add":"plus","add_box":"square-plus","add_circle":"circle-plus",
    "remove":"minus","arrow_back":"arrow-left","arrow_forward":"arrow-right",
    "arrow_upward":"arrow-up","arrow_drop_down":"chevron-down","arrow_right_alt":"move-right",
    "chevron_left":"chevron-left","chevron_right":"chevron-right","expand_more":"chevron-down",
    "keyboard_arrow_up":"chevron-up","unfold_more":"chevrons-up-down","swap_vert":"arrow-up-down",
    "east":"arrow-right","more_vert":"ellipsis-vertical",
    // objects / content
    "description":"file-text","article":"file-text","summarize":"file-text",
    "note_add":"file-plus","picture_as_pdf":"file-text","data_object":"braces",
    "dataset":"database","table":"table","newspaper":"newspaper","menu_book":"book-open",
    "book":"book","bookmark":"bookmark","bookmark_add":"bookmark-plus",
    // editing
    "edit":"pencil","edit_note":"pencil","draw":"pen-tool","delete":"trash-2","delete_sweep":"trash-2",
    "save":"save","download":"download","attach_file":"paperclip","link":"link",
    "open_in_new":"external-link","open_in_full":"maximize-2","close_fullscreen":"minimize-2",
    "aspect_ratio":"ratio","ios_share":"share","send":"send","forward_to_inbox":"forward",
    // people
    "person":"user","person_alert":"user-round-x","group":"users","groups":"users",
    "supervisor_account":"user-cog","how_to_reg":"user-check","badge":"id-card",
    "assignment_ind":"user-round-pen","record_voice_over":"megaphone","accessibility_new":"accessibility",
    // status / feedback
    "check_circle":"circle-check","check_box":"square-check","check_box_outline_blank":"square",
    "task_alt":"circle-check-big","verified":"badge-check","verified_user":"shield-check",
    "info":"info","warning":"triangle-alert","error":"circle-x","dangerous":"octagon-x",
    "priority_high":"circle-alert","crisis_alert":"siren","report":"octagon-alert",
    "running_with_errors":"clock-alert","emergency_home":"house-plus","help":"circle-help",
    "flag":"flag","rule":"scale","policy":"shield-check","approval":"circle-check",
    "thumb_up":"thumbs-up","thumb_down":"thumbs-down","thumbs_up_down":"scale","rate_review":"message-square-more",
    "content_copy":"copy",
    "pending_actions":"clock-arrow-down","hourglass_bottom":"hourglass","change_circle":"refresh-cw",
    // time
    "schedule":"clock","calendar_today":"calendar","calendar_month":"calendar",
    "event":"calendar","event_available":"calendar-check","event_busy":"calendar-x","history":"history",
    // dashboards / layout
    "space_dashboard":"layout-dashboard","dashboard":"layout-dashboard","dashboard_customize":"layout-dashboard",
    "psychology":"brain","neurology":"brain","right_panel_open":"panel-right","right_panel_close":"panel-right-close",
    "grid_view":"layout-grid","view_module":"grid-3x3","widgets":"layout-grid","apps":"grid-3x3","cards":"gallery-horizontal-end",
    "category":"shapes",
    "account_tree":"git-branch","hub":"share-2","explore":"compass","tour":"map-pin",
    // charts
    "analytics":"chart-column","monitoring":"chart-line","show_chart":"chart-line",
    "trending_up":"trending-up","trending_down":"trending-down","speed":"gauge",
    // search / filter
    "manage_search":"search-check","filter_list":"list-filter","tune":"sliders-horizontal",
    "fact_check":"clipboard-check","checklist":"list-checks","frame_inspect":"scan-search",
    // notifications / comms
    "notifications":"bell","campaign":"megaphone","chat_bubble":"message-circle",
    "forum":"messages-square","mail":"mail","inbox":"inbox","mark_email_read":"mail-check",
    // media
    "videocam":"video","photo_camera":"camera","image":"image","mic":"mic",
    "play_arrow":"play","play_circle":"circle-play","pause":"pause","volume":"volume-2",
    // system / actions
    "refresh":"refresh-cw","restart_alt":"rotate-ccw","power_off":"power","logout":"log-out","shuffle":"shuffle",
    "lock":"lock","home":"house","push_pin":"pin","keep":"pin","keep_off":"pin-off",
    "auto_awesome":"sparkles","bolt":"zap","lightbulb":"lightbulb","star":"star",
    "celebration":"party-popper","local_fire_department":"flame","visibility":"eye",
    "phone_iphone":"smartphone","place":"map-pin","public":"globe","science":"flask-conical",
    "biotech":"microscope","ecg_heart":"heart-pulse","health_and_safety":"heart-handshake",
    "personal_injury":"bandage","masks":"shield","thermostat":"thermometer",
    // industry / ops
    "precision_manufacturing":"factory","engineering":"hard-hat","construction":"construction",
    "build":"wrench","handyman":"hammer","factory":"factory","forklift":"forklift",
    "local_shipping":"truck","inventory":"package","inventory_2":"package","workspaces":"layers",
    "workspace_premium":"award","school":"graduation-cap","support":"life-buoy",
    "door_front":"door-open","stairs":"footprints",
    // finance
    "payments":"credit-card","attach_money":"dollar-sign","savings":"piggy-bank",
    // misc texty
    "assignment_late":"clipboard-x","assignment_turned_in":"clipboard-check",
    "123":"hash"
  };

  var FALLBACK = "circle"; // used if an unknown ligature slips through

  /* ---- sizing / color styles for generated SVGs ---- */
  function injectStyle() {
    if (document.getElementById('praxis-lucide-style')) return;
    var s = document.createElement('style');
    s.id = 'praxis-lucide-style';
    s.textContent =
      "svg.material-symbols-rounded, .material-symbols-rounded > svg {" +
      "width:1em;height:1em;display:inline-block;vertical-align:middle;flex-shrink:0;}" +
      /* Lucide's default stroke is 2 (a touch heavy); thin every generated
         icon app-wide. .lucide is on every icon regardless of source
         (converted Material spans and hand-authored <i data-lucide>). */
      "svg.material-symbols-rounded, svg.lucide{stroke-width:1.5;}";
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- assign data-lucide + clear text for every unconverted MS element ---- */
  function tag() {
    var els = document.querySelectorAll(
      '.material-symbols-rounded:not(.lucide):not([data-lucide])'
    );
    var n = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var lig = (el.textContent || '').trim();
      if (!lig) continue;               // already emptied / no ligature
      if (!/^[a-z0-9_]+$/.test(lig)) continue; // skip stray non-ligature text
      var name = MAT2LUCIDE[lig] || FALLBACK;
      el.setAttribute('data-lucide', name);
      el.textContent = '';
      n++;
    }
    return n;
  }

  function convert() {
    injectStyle();
    tag();
    /* Only invoke Lucide when unconverted markup actually remains — a
       placeholder <i>/<span> that carries data-lucide but isn't an <svg> yet.
       Lucide's generated <svg> keeps its data-lucide attribute, so calling
       createIcons() unconditionally re-replaces every icon on the page; that
       DOM churn retriggers our own MutationObserver, which calls convert()
       again — an endless loop that recreates icons ~120x/sec, eating clicks
       (mousedown/mouseup land on different nodes) and jamming the UI. The
       guard below plus stripping data-lucide from finished SVGs break it. */
    if (!document.querySelector('[data-lucide]:not(svg)')) return;
    var obs = window.__praxisLucideObserver;
    if (obs) obs.disconnect();                       // ignore our own mutations
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    var made = document.querySelectorAll('svg[data-lucide]');
    for (var i = 0; i < made.length; i++) made[i].removeAttribute('data-lucide');
    if (obs && document.body) obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ---- debounced observer so JS-rendered icons convert automatically ---- */
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      convert();
    });
  }
  function startObserver() {
    if (!document.body || window.__praxisLucideObserver) return;
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { schedule(); return; }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.__praxisLucideObserver = obs;
  }

  /* ---- boot: load vendored Lucide, then convert ---- */
  function boot() {
    convert();
    startObserver();
  }

  // Capture this script's URL synchronously (currentScript is null later).
  var MY_SRC = (document.currentScript && document.currentScript.src) || '';

  function loadLucide() {
    if (window.lucide) { boot(); return; }
    var vendorUrl = MY_SRC
      ? MY_SRC.replace(/[^\/]*$/, 'vendor/lucide.min.js')
      : 'vendor/lucide.min.js';
    var s = document.createElement('script');
    s.src = vendorUrl;
    s.onload = boot;
    s.onerror = function () {
      var cdn = document.createElement('script');
      cdn.src = 'https://unpkg.com/lucide@latest';
      cdn.onload = boot;
      (document.head || document.documentElement).appendChild(cdn);
    };
    (document.head || document.documentElement).appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLucide);
  } else {
    loadLucide();
  }
})();
