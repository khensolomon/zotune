# Releasing

The source in `app/` runs as it is during development. A release builds it
(`npm run build`, esbuild) and deploys the build. Nothing built is committed:
`dist/` is ignored, and the release workflow builds inside its own run.

## Day to day

| Command | Does |
|---|---|
| `npm run serve` | Serves the source in `app/`; edit and reload. |
| `npm test` | Unit tests, including a build checked file by file. |
| `npm run build` | Writes the production site to `dist/web`. |
| `npm run serve -- --dist` | Serves `dist/web`, exactly what a release deploys. |
| `npm run release:plan` | Shows what the last commit would release. |

## What the build does

- Bundles and minifies `js/main.js` and the data worker; minifies
  `js/theme.js` and `css/app.css`.
- Names each of these by a hash of its content (`main.4c14636c54.js`) and
  points `index.html` at the new names, so browsers can keep them for a year
  (`_headers`) and a release can never be mixed with an older one.
- Writes the service worker's cache name and file list. `app/sw.js` holds
  placeholders that the build replaces.
- Stops with the reason if any rewrite does not match exactly once.

Compression over the network is left to the host.

## Making a release

```sh
node scripts/version.mjs --note "…" --apply
git commit -am "release: web 26.10.17.3"
```

The commit reaches master either pushed directly or as a pull request merged
with **Squash and merge** and titled `release: web …` (the title becomes the
commit message). A merge commit (`Merge pull request #…`) releases nothing.
**Actions → release → Run workflow** releases the current master without a
special commit.

| First line | Releases |
|---|---|
| `release: web` | Tests, build, deploy to Cloudflare |
| `release: desktop` | Not set up yet; the plan stops with that reason |
| `release: all` | Both; stops for the same reason until desktop is set up |

A version written after the target must be the stamped one, and the version
must agree in `app/version.json`, `package.json`, `package-lock.json`,
`app/index.html` and `CHANGELOG.md`. Other pushes, a README change included,
only run the tests; they never deploy.

## One-time setup

1. **Cloudflare API token.** Cloudflare dashboard → My Profile → API Tokens →
   Create Token → template **Edit Cloudflare Workers**, limited to the account
   that holds the site.
2. **Account ID.** Shown on the Workers & Pages overview.
3. **GitHub secrets.** Repository → Settings → Secrets and variables →
   Actions: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. **Live check (optional).** Repository variable `SITE_URL`, for example
   `https://zotune.com`. After deploying, the workflow reads the page and
   requires its `application-name` meta to carry the released version.
5. **Cloudflare's own Git build: off.** Workers & Pages → the project →
   Settings → Build: disconnect the repository. Releases arrive only from the
   workflow; Cloudflare builds nothing itself. The Worker name in
   `wrangler.jsonc` (`zotune`) must match the project's name.
