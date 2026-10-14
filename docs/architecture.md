# Architecture

Zotune is a Zolai–English dictionary. The same HTML5 single-page application runs in
three places:

| Target | Audience | Shell |
| --- | --- | --- |
| Web (zotune.com) | Readers and testers, mostly on Android phones | Browser + service worker (installable PWA) |
| Desktop | Checkers and dataset maintainers on Windows, macOS, Linux | Electron, frameless window |
| Development | Maintainers | `npm run serve` (Node stdlib static server) |

The application code in `app/` never depends on Electron. Desktop-only behaviour
(window controls, OS deep links) is reached through a small, optional bridge
(`window.zotune`) exposed by `desktop/preload.js`. When the bridge is absent the app
behaves as a website.

Rationale: most readers and testers use Android phones, where Electron does not run.
A single web codebase keeps phone and desktop behaviour identical; Electron adds a
native window, offline install and OS integration for the few desktop users.

## Repository layout

```
app/                    the SPA (served as-is, no build step)
  index.html            shell: header, view outlet
  css/app.css           design tokens and components
  js/main.js            boot: router, header, status, service worker
  js/router.js          History API router with deep links
  js/store.js           IndexedDB wrapper (shared by window and workers)
  js/search-client.js   promise-based RPC to the search worker
  js/actions.js         bookmark, like, helpful/correct votes, proposals → outbox
  js/text.js            Zolai/English normalisation (shared by window and workers)
  js/workers/           background workers (dataset load, indexing, search)
  js/views/             one module per route
  js/components/        header, search field, footer, window controls
  data/sample.json      provisional sample dataset (see "Dataset pack")
  sw.js                 service worker (web only)
desktop/                Electron main and preload
scripts/serve.mjs       development server with SPA fallback
tests/                  node:test unit tests
docs/                   this document
```

No bundler, no framework, no runtime dependencies. Electron is the only
development dependency.

## Front end

### Routing and deep links

Routes are real paths handled by the History API:

| Path | View |
| --- | --- |
| `/` | Home |
| `/definition` | Definition page with no query (how-to help) |
| `/definition/{word}` | Definition of a word (`{word}` is URL-encoded) |
| `/about` | About |
| `/me` | Bookmarks, likes and pending changes on this device |
| `/workspace` | Dataset management |
| `/workspace/entry/{id}` | Proposal editor for one entry |

- Web: the host serves `index.html` for any path without a file extension
  (Cloudflare Pages does this by default; `scripts/serve.mjs` does the same).
- Desktop: the window loads `app://zotune/…` from a privileged custom scheme
  whose handler applies the same fallback, so paths and `pushState` work exactly as
  on the web. `file://` is not used because it breaks absolute paths and module
  workers.
- OS links: `zotune://definition/itna` opens the desktop app at that route
  (single-instance lock; `open-url` on macOS, `second-instance` elsewhere).
- Hidden navigation (no visible UI): `[` and `]` step to the previous and next
  headword, `/` focuses search.

### Background work

The dataset is owned by a module worker (`js/workers/data.worker.js`):

1. On start it opens IndexedDB and compares the stored pack version with the
   available one.
2. If newer, it downloads the pack, writes entries in batches, and rebuilds the
   search index, all off the main thread.
3. It answers `search`, `suggest`, `entry` and `neighbours` requests.

The window talks to it through `search-client.js` (request ids + promises). The UI
never blocks on parsing or indexing. Status (`loading`, `ready`, `offline`) is
broadcast to the header indicator.

Dedicated workers are used rather than `SharedWorker`, which is unreliable on
Android browsers. Several tabs each run their own worker against the same
IndexedDB database.

### Search

- One input, no language switch. Each query is matched against Zolai headwords,
  alternative spellings and English glosses at the same time; results carry the
  side they matched on.
- Normalisation (`text.js`): lower case, Unicode NFKD with combining marks
  removed, curly quotes folded. Hyphens and spaces are removed for the matching
  key, so `amaute`, `amau te` and `amau-te` find the same rows while the data keeps
  the written form.
- Index: sorted array of `[key, entryId]` pairs with binary-search prefix lookup.
  Exact matches rank first, then headword prefix, then English gloss.

### Persistent storage

IndexedDB database `zotune`, version 1:

| Store | Key | Holds |
| --- | --- | --- |
| `meta` | name | pack version, index build time |
| `entries` | `id` | dictionary entries from the pack |
| `marks` | `[kind, entryId]` | bookmarks and likes (`kind` = `bookmark`, `like`) |
| `votes` | `[kind, senseId]` | helpful / correct votes (`yes`, `no`) |
| `outbox` | auto id | actions waiting to be sent to the server |

`navigator.storage.persist()` is requested after the first bookmark, like or vote,
so the browser does not evict user data under storage pressure.

Every user action is applied locally first and then queued in `outbox`. The app is
fully usable offline; sending happens when an API is configured and the device is
online. Until the backend exists the outbox only fills; it is visible under `/me`.

### Styling

Plain CSS with custom properties. Rules carried over from the approved mockups:

- White background everywhere; no tinted page backgrounds.
- 2px band in the Tedim puan colour at the top.
- Header and footer span the full width; content is left-aligned with a max width.
  Header, body and footer share the same side gutter.
- Shared header on every page: menu (Home, Definition, About) on the left, icons
  only (status, user) on the right.
- Definition pages pin the logo + search bar under the header and add a shadow when
  scrolled. The menu row scrolls away.
- Search field: icon only, no "Search" or "Look up" button.
- Soft corners: inputs and menu items 8px.
- Footer on every page except Home.
- Logo: `app/assets/logo.svg` (the approved wordmark). Favicon and app icons:
  `app/assets/favicon.svg` (Zosia mark).
- Fonts are self-hosted (Figtree for UI, Source Serif 4 for Zolai headwords and
  examples) so the desktop app and offline web work without network access.

## Desktop shell (Electron)

- `frame: false` on Windows and Linux with window controls drawn in the header;
  `titleBarStyle: 'hidden'` on macOS so the native traffic lights stay.
- The header is the drag region (`-webkit-app-region: drag`); links, inputs and
  buttons opt out.
- Security: `contextIsolation`, `sandbox`, no `nodeIntegration`, navigation and
  `window.open` restricted to the app origin (external links open in the system
  browser), strict Content Security Policy in `index.html`.
- Preload exposes only: platform name, minimise / maximise / close, maximised state,
  and a deep-link listener.

## Back end (Cloudflare) — proposed, not implemented

| Need | Cloudflare piece |
| --- | --- |
| Host the web app | Pages (zotune.com) |
| API (votes, likes, proposals, auth) | Workers (`api.zotune.com`) |
| Relational data: users, votes, proposals, review state | D1 |
| Dataset packs, email attachments, exports | R2 |
| Rate-limit counters, feature flags | KV, or Durable Objects where counts must be exact |
| Bot check without puzzles | Turnstile (invisible / managed) |
| Contributions by email | Email Routing → Email Worker |
| Slow jobs (validation, notifications) | Queues |

The public dictionary stays static: a reader never needs the API. The API is only for
writing (votes, likes, proposals) and for the workspace.

## Contributions

Three ways in, one pipeline:

1. In the app: "Improve this entry" creates a structured proposal (fields, not free
   text), queued in the outbox and sent to the API.
2. Email: a message to a contributions address with a patch or Markdown file
   attached. The Email Worker stores the raw message in R2 and records a pending
   item in D1. Nothing in an email is executed.
3. Markdown files: a documented template (headword, part of speech, meaning,
   examples, source), so contributors who prefer text editors can write entries
   offline.

Core scripts (Python, stdlib only, dry run by default, `--apply` to commit):

- `inbox fetch`: pull pending items from R2/D1 into a local inbox folder.
- `inbox parse`: turn emails, patches and Markdown into the dataset's raw row
  format, reporting every line that cannot be parsed (fail fast, no guessing).
- `inbox check`: validate against the dataset rules, detect duplicates and spelling
  variants, and show a diff against current data.
- `inbox accept`: hand accepted rows to the dataset's import tool and mark the items
  done on the server.

These scripts sit next to the dataset tooling, so a contribution ends up in the
same files that maintainers edit.

## Accounts and bot protection — proposed, not implemented

Goal: zero friction for genuine contributors; bots, spam and prompt testing filtered
out.

Trust grows with behaviour. There is no sign-up form or password.

| Level | How it is reached | Can do |
| --- | --- | --- |
| Reader | Opens the app | Read, search, bookmark and like locally |
| Device | First write action: an invisible Turnstile check plus a device key | Votes and likes counted, small rate limit |
| Contributor | Optional passkey or email link, at the moment a proposal is sent | Send proposals; votes weigh more |
| Reviewer | Promoted by a maintainer | Accept or reject proposals in the workspace |

- Device key: a non-extractable ECDSA key made with WebCrypto and kept in
  IndexedDB. Requests are signed, so a vote cannot be replayed or forged without the
  device. Clearing site data creates a new, untrusted device.
- Turnstile runs only when something is written, never while reading, and is
  invisible for most people.
- Rate limits per device, per IP range and per account; new devices get the
  smallest budget.
- Votes are recorded per device and weighted by trust level. One device cannot move
  a sense's status on its own.
- Every proposal goes to a review queue; nothing is published automatically.
- Prompt testing and injection: contributions are treated as data only. They are
  stored and displayed as text, never passed to a model or a shell as instructions.
  Any automated checking (including language models) receives them as quoted data
  with a fixed task. Proposals with links, very long text or text that looks like
  instructions are flagged for a reviewer.
- Honeypot fields and minimum time-to-submit on forms catch simple scripts.

## Dataset pack

`app/data/sample.json` is a hand-written sample with the shape the UI needs:

```json
{
  "version": "sample-1",
  "entries": [
    {
      "id": "w1", "word": "itna", "syllables": "it·na",
      "spellings": ["it na"], "origin": "from {it}, to love, and {-na}, making a noun",
      "status": "draft", "english": ["love", "affection", "charity"],
      "senses": [
        { "id": "s1", "pos": "noun", "gloss": "love; affection", "definition": "…",
          "examples": [{ "zo": "…", "en": "…", "ref": "…" }],
          "similar": ["deihna"], "opposite": ["huatna"] }
      ]
    }
  ]
}
```

The real pack will be built from the format 3 dictionary tables in the catalog
repository. The pack builder belongs with that tooling and is a separate piece of
work once the format 3 release file is fixed.

## Open decisions

1. Pack source: build the app pack from the format 3 tables directly, or from the
   planned release file for applications.
2. Contributor identity: passkeys only, email link only, or both.
3. Vote outcome: how many trusted "correct" votes move a sense from draft to
   reviewed, and whether a single "no" from a reviewer overrides them.
4. Email contributions: one public address, or per-contributor addresses.
5. Desktop distribution: unsigned builds for a small group of checkers first, or
   signed installers from the start.
