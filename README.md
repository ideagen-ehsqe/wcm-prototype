# Work clearance management — Praxis prototype

Two prototypes live in this folder.

| File | What it is |
|---|---|
| `WCM Prototype 2.html` | The original, untouched. Self-contained, hand-rolled tokens and components. |
| `wcm-praxis.html` + `wcm-praxis.css` + `wcm-praxis.js` | The rebuild. Same scenario and the same narrated demo, built on the published Praxis package. |

Open `wcm-praxis.html` directly in a browser — no build step, no server. It loads
Praxis from `node_modules`, so keep the folder together (or swap in the CDN, below).

## Running, deploying, handing out

```sh
npm install     # pins @ideagen-ax/praxis at 0.1.2
npm run build   # stages public/ — what Vercel serves
npm run bundle  # writes an offline zip, if someone ever needs one again
```

`npm run build` copies the rebuild plus the Praxis package into `public/`, as
`index.html` so a bare `/` resolves. `WCM Prototype 2.html` is deliberately not copied,
so the original is in the repo but never published. Vercel is wired to this via
`vercel.json`; pushing to `main` deploys.

Copying the whole Praxis package rather than picking out the four files the markup names
is on purpose — the first hand-built bundle silently shipped without
`praxis-navdrawer.js`, and copying the package makes that class of omission impossible.

The offline zip is generated on demand and is not kept in the repo — the deployment is the
way to share this now. `npm run bundle` is still here for the case it isn't reachable, but
whatever it writes goes stale the moment the prototype changes, so generate it when you
need it rather than keeping one around.

## Consuming Praxis

```sh
npm install          # pins @ideagen-ax/praxis at 0.1.2
```

```html
<link rel="stylesheet" href="node_modules/@ideagen-ax/praxis/dist/praxis-reset.css">
<link rel="stylesheet" href="node_modules/@ideagen-ax/praxis/dist/praxis.css">
<script src="node_modules/@ideagen-ax/praxis/dist/praxis-lucide.js"></script>
<script src="node_modules/@ideagen-ax/praxis/dist/praxis-navdrawer.js"></script>
```

The version is pinned exactly, as `PRAXIS-FOR-AGENTS.md` asks: Praxis is pre-1.0 and
class names, token names and markup can change in any release. To hand the file to
someone without the folder, replace the two `node_modules/...` paths with
`https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.2/dist/...` and it works unchanged.

`npm i @ideagen-ax/praxis` run from an empty folder resolves to the nearest ancestor
`package.json` — on this machine that was `~/Desktop/package.json`, so the first install
landed there and pruned that project's extraneous packages. The local `package.json`
here prevents that.

## What the rebuild uses from the package

| Praxis | Used for |
|---|---|
| `.app` / `.appbar` / `.main` / `.praxis-navrail` / `.content` | The canonical four-band shell. Chrome is fixed; only `.page-body` scrolls. |
| `.pageheader`, `.breadcrumb`, `.pageheader__status` | One header band; each view supplies its contents. |
| `.toolbar`, `.tbtn`, `.tbtn--primary/--icon/--ghost` | One toolbar band, same treatment. |
| `.admin-field` + `.admin-field__value` | Every read-only record row — label beside value, automatic colon, hairline rules. |
| `.admin-tabs` / `.admin-tab` | Record section tabs. |
| `.admin-table-wrap` / `.admin-table-scroll` / `.admin-table` | The permits list, with sticky head and zebra rows. |
| `.cn-flyout` / `.cn-tpl` / `.cn-group--{tone}` | "New permit" — the real Create New flyout, anchored to the rail. |
| `.cn-overlay` / `.cn-modal` / `.cn-head` / `.cn-footer` | The signature dialog. |
| `.px-pop` | Role menu and the required-fields popover. |
| `.card`, `.switch`, native checkboxes, `.px-skip`, `.visually-hidden` | Throughout. |
| `.mazlan-mark` | The four-dot AI signature, plus the teal→magenta gradient for the Mazlan panel. |
| `--praxis-*` / `--px-*` tokens, `--praxis-tone-*` pairs | All colour, spacing, radius, elevation and motion. |
| `praxis-lucide.js` | Every icon. The original used emoji. |
| `praxis-navdrawer.js` | The phone nav drawer, derived from the rail's own `aria-label`s — no extra markup. |

`wcm-praxis.css` carries only what Praxis deliberately leaves to the host: the
`.page-body` scroll rule, the `.btn` base (the package styles `.btn--primary` but ships
no base), and the prototype-specific surfaces with no Praxis component — status chips,
callouts, KPI tiles, the workflow rail, the record tree, the SAP mirror, the phone frame,
the notification drawer and the guided-demo chrome. No `--praxis-*` or `--px-*` token is
redefined in it.

## What changed from the original

**Design system**

- The hand-rolled `:root` block — 60-odd colour, radius and shadow variables that
  approximated Praxis — is gone. Everything resolves from the package, so both themes
  come for free instead of the original's partial dark mode.
- Emoji glyphs (🔥 ☢️ 🔒 📱 …) became Lucide icons through the package's converter.
- Every uppercase label is sentence case. The original had `text-transform: uppercase`
  on card headings, the demo-bar label, the start eyebrow and the roadmap tags.
- Read-only rows were bespoke `.field-row` grids; they are now the `.admin-field` static
  rows, so they match every other record page in the product.

**Structure**

- Six full-page sections each with their own header and toolbar became one Praxis shell
  with fixed bands: the app bar, page header and toolbar stay put and the content column
  scrolls, which is what the 192px `--px-dot-clear` figure assumes.
- 60-odd inline `onclick` attributes became one delegated `[data-act]` handler.
- Overlays use the `[hidden]` attribute the `.cn-*` and `.px-pop` materials are written
  against, rather than an `.on` class.
- The theme is written to `localStorage['gl-theme']`, the key Praxis reads, and applied
  from an inline script that is the first thing inside `<body>`. It survives a reload.

**Interaction and accessibility**

- Tabs are real `role="tab"` buttons with arrow-key movement and `aria-selected`; they
  were clickable `<div>`s.
- Escape closes the topmost layer. Scrim clicks dismiss. Popovers carry `aria-expanded`.
- `.px-skip` skip link; toast region is an `aria-live` status region; the bell announces
  how many actions need attention.
- **Authorise is now actually blocked until the isolation (or the RWP) is signed.** The
  original showed that rule in a banner but let you authorise anyway. Disabled controls
  also carry the reason as their `title`, so a dead button explains itself.
- The pre-job brief on the phone now gates its continue button on all four items, the
  way the isolation checklist already did.
- The status filter chips on the permits list filter the list; they were decorative.
- The role switcher moved from an app-bar pill into the avatar popover — the same move
  `praxis-workspace.css` records for its own persona switcher. A pill carrying the full
  name and role was wider than the 420px the centred search pill reserves, and it
  overlapped the search field at 1440px.
- The notification drawer opens from the right. On the left it collided with the nav rail
  and with the phone nav drawer.

**Home page, aligned to Groom Lake**

Groom Lake is the reference implementation for these patterns; the home page was rebuilt
against it rather than inventing a second treatment.

- The greeting was a teal→magenta gradient banner. It is now text on the page —
  `.ws-greet`'s treatment: 2xl/700 heading, context line beneath in secondary ink. With
  no background there is no contrast pairing to defend; both lines measure 4.91:1 in
  light and 7.62:1 in dark against the page surface.
- Component headers follow `.card__title`: a flat icon chip on `--px-surface-2` —
  recessed in light, lifted in dark — then a 1rem/700 label, then a divider. The divider
  is a plain `border-bottom` on the heading, which stops at the card's content edge on
  its own, so Groom Lake's inset needs no inset rule. The chip is sized by padding, not
  width, because `praxis-lucide.js` replaces the ligature span with a 1em SVG.
- Shortcut icons take the primary CTA treatment straight from the package's
  `--px-primary-grad` / `-fg` / `-shadow`, the same tokens `.btn--primary` paints. Each
  shortcut is a way into another part of the app, so the icon carries the call to action.
  Both themes come free from the token redeclaration; the dimmer `--px-primary-soft` set
  stays where Praxis scopes it, to toolbars in dark.
- The Mazlan panel's suggested prompts are now the package's own `.mazlan-sugg` cards —
  the exact markup `praxis-mazlan.js` renders into the drawer, with tints from its
  `MAZLAN_CAT_COLORS` map. One deviation: `.mazlan-sugg__title` truncates to a single
  line in the drawer, which suits its short title-case labels. These are full questions
  in a narrower column, so they wrap instead of ellipsing away the operative clause.

The narrated demo is unchanged in content: the same 30 scenes, the same narration, the
same speech-synthesis handling, mute, pause, skip and captions.

## Verification

Driven headlessly in Chromium (Playwright), 1440 / 834 / 640 / 390px, both themes:

- No console errors, no page errors, no failed requests on any surface.
- Full lifecycle asserted end to end: SAP pull → notification → isolation certified by
  the isolating authority → authorisation blocked while signed in as that same role →
  authorised by the authorising person → phone brief, isolation proof, close-out →
  de-isolation blocked for the wrong role → hand-back. End state checked: SAP `TECO`,
  permit `Closed`, open permits 6→5, live isolations 1→0, bell cleared, all seven
  workflow steps done, five audit entries written.
- The guided demo runs to completion without throwing.
- Text contrast measured on every text node of every surface in both themes, against the
  composited background. All pass WCAG 1.4.3 (4.5:1, or 3:1 where the text qualifies as
  large). Three fixes came out of this — see below.
- The phone nav drawer builds itself from the rail and its items navigate.

Not verified: real assistive-technology testing, keyboard-only traversal of every
surface, Safari and Firefox, and the narration voice (browser-dependent).

## Findings for the Praxis maintainers

Measured against 0.1.2 while building this.

1. **`praxis-reset.css` sets `a{color:inherit}`.** Loaded after `praxis.css` — the order
   the README's install snippet implies — it silently flattens every link in the app to
   body ink, including inside `.admin-table`. Loading the reset first fixes it. Worth
   saying explicitly in the docs, or dropping that one declaration.
2. **The light-mode `--praxis-tone-warning` pair fails contrast for small text.**
   `#cb6e00` on `#fdf2e6` measures 3.3:1, and `tone-warning-fg` on `--px-surface`
   measures 3.64:1, against the 4.5:1 that 12–14px semibold needs. The pairs are
   documented for chips and badges, which is exactly this size. The dark pair passes.
   `orange-90` on the same washes clears it. This page uses a local `--wcm-warning-ink`
   for now.
3. **There is no tone pair for the solution/record-type colours.** The `--cn-tone` hues
   are built for 24–32px icons; used as 12px chip text they measure 2.3–4.2:1 in one
   theme or the other. This page carries the type colour as a key marker beside neutral
   label text instead, which also stops colour being the only carrier of meaning.
4. **`.admin-field:has(> .admin-field__value)` rows have no `-1px` overlap rule,** so two
   stacked in one column paint their hairlines twice. The sheet's own comment predicts
   this. `.rfield--locked` has the rule; the read-out rows want it too.
5. **`.cn-tpl__name` / `.cn-tpl__meta` set no `display`,** so they assume block children
   and run together when built from spans inside a `<button>`.
6. **`.appbar__module` is not hidden below 768px, but `.msel` is.** A page using the
   in-pill module button keeps it and the phone app bar overlaps itself. The 420px
   right-cluster reserve is also worth documenting as a budget consumers have to live
   within.
7. **`.admin-table-wrap` is `overflow:hidden`** with no horizontal scroll, so a wide table
   loses its right-hand columns on a phone. `.admin-table-scroll` solves it but its name
   and its 440px `max-height` read as vertical-only.
8. **One `text-transform:uppercase` survives in the bundle** — `.tb-options__sechead`, in
   the compact-toolbar Options popover. Every neighbouring rule carries a "sentence case,
   weight for emphasis" comment, so this looks like a miss.

## Deliberate omissions

- **`praxis-toolbar-compact.js`** — it collapses the toolbar into a Tools menu by moving
  controls into a popover. This page swaps a different toolbar per view and the guided
  demo spotlights toolbar buttons by id, so the two would fight. The toolbar wraps
  instead at narrow widths.
- **`praxis-filters.js`** — the permits list needs one status filter, not a 118KB
  expression-tree engine whose drawer chrome is not shipped as markup.
- **The Mazlan drawer** — `praxis-mazlan.js` needs about fifteen fixed element ids whose
  markup is not in the package. Mazlan is a stub here, as it was in the original. The
  package notes this is the one real blocker and asks consumers to raise it.
- **`praxis-profile-menu.js`** — it renders its own contents into `.profile-menu__pop`,
  which would fight the role switcher this prototype needs in that spot.
- **Gilroy** — licensed and not redistributable, so the type falls through to the system
  stack. Layout and metrics are unaffected.
