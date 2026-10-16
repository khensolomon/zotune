# zotune

Zolai–English dictionary. One HTML5 app (vanilla JavaScript, no build step) that
runs on the web and in a frameless Electron window.

## Run

```bash
npm install          # Electron only; the web app has no dependencies
npm run serve        # web app at http://127.0.0.1:5173/
npm run serve -- --cite ../bible/cite   # same, reading a local checkout of the tables
npm start            # desktop app
npm test             # unit tests (node:test)
```

## Layout

| Path | Contents |
| --- | --- |
| `app/` | The single-page app: routes, views, workers, styles, fonts, icons |
| `app/data/source.json` | Version of the dictionary tables the app reads |
| `desktop/` | Electron main process and preload bridge |
| `scripts/serve.mjs` | Development server with deep-link fallback |
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
version is made with `node scripts/version.mjs --note "…" --apply`.

## Links

Every screen has its own URL, for example `/definition/itna`. The desktop app also
answers `zotune://definition/itna`.

Keyboard: `/` focuses search; on a definition, `[` and `]` go to the previous and
next word.

## Fonts

Figtree and Source Serif 4 are bundled under the SIL Open Font License
(`app/fonts/OFL-*.txt`).
