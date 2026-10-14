# zotune

Zolai–English dictionary. One HTML5 app (vanilla JavaScript, no build step) that
runs on the web and in a frameless Electron window.

## Run

```bash
npm install          # Electron only; the web app has no dependencies
npm run serve        # web app at http://127.0.0.1:5173/
npm start            # desktop app
npm test             # unit tests (node:test)
```

## Layout

| Path | Contents |
| --- | --- |
| `app/` | The single-page app: routes, views, workers, styles, fonts, icons |
| `app/data/sample.json` | Provisional sample dataset |
| `desktop/` | Electron main process and preload bridge |
| `scripts/serve.mjs` | Development server with deep-link fallback |
| `tests/` | Unit tests |
| `docs/architecture.md` | Architecture, back-end plan and open decisions |

## Links

Every screen has its own URL, for example `/definition/itna`. The desktop app also
answers `zotune://definition/itna`.

Keyboard: `/` focuses search; on a definition, `[` and `]` go to the previous and
next word.

## Fonts

Figtree and Source Serif 4 are bundled under the SIL Open Font License
(`app/fonts/OFL-*.txt`).
