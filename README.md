# zotune

Zolai–English dictionary. One HTML5 app (vanilla JavaScript; the source runs as it is,
and a release is bundled with esbuild) that runs on the web and in a frameless
Electron window.

## Run

```bash
npm install          # Electron and esbuild (development only); the app itself has no dependencies
npm run serve        # web app from the source, at http://127.0.0.1:5173/
npm run serve -- --cite ../bible/cite   # same, reading a local checkout of the tables
npm run build        # production build in dist/web (not committed)
npm run serve -- --dist                 # serves that build
npm start            # desktop app
npm test             # unit tests (node:test), including a checked build
```

## Layout

| Path | Contents |
| --- | --- |
| `app/` | The single-page app: routes, views, workers, styles, fonts, icons |
| `app/data/source.json` | Version of the dictionary tables the app reads |
| `desktop/` | Electron main process and preload bridge |
| `scripts/serve.mjs` | Development server with deep-link fallback |
| `scripts/build.mjs` | Production build (esbuild) into `dist/web` |
| `scripts/version.mjs`, `scripts/release-plan.mjs` | Version stamping; what a push releases |
| `.github/workflows/` | Tests on every push; releases on `release: …` commits |
| `tests/` | Unit tests |
| `docs/architecture.md` | Architecture, back-end plan and open decisions |

## Dictionary data

The app reads the tables of [laisiangtho/bible/cite](https://github.com/laisiangtho/bible/tree/master/cite)
directly, at the version named in `app/data/source.json` (a commit id or tag).
Publishing a new version of the dictionary means changing `ref` there. See
`docs/architecture.md`, "Dictionary data", for tiers and offline behaviour.

## Versions

Releases are numbered vYY.MM.DD.N (the date and the release number of that
day) and listed in `CHANGELOG.md`, together with what the app does. The next
version is made with `node scripts/version.mjs --note "…" --apply`, which also
writes it into `app/index.html` as
`<meta name="application-name" content="zotune.com" data-version="…">`, so the
page source shows which version a server delivered.

## Links

Every screen has its own URL, for example `/definition/itna`. `/#/definition/itna`
opens the same page and the address changes to the plain form. The desktop app also
answers `zotune://definition/itna`.

Keyboard: `/` focuses search; on a definition, `[` and `]` go to the previous and
next word.

## Deploy

A commit on master whose first line is `release: web` is tested, built and deployed
to Cloudflare by `.github/workflows/release.yml`; other pushes are only tested.
`wrangler.jsonc` makes every address that is not a file load the app, so links like
`/definition/itna` work when opened directly. Steps and one-time setup:
`docs/releasing.md`.

## Fonts

Figtree and Source Serif 4 are bundled under the SIL Open Font License
(`app/fonts/OFL-*.txt`).
