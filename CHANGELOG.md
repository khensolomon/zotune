# Changelog

Versions are written **vYY.MM.DD.N**: the date of the release and N, the number
of the release on that day (1 for the first). `app/version.json` holds the
version. `package.json` holds the same version as YY.MMDD.N (v26.10.16.1 is
26.1016.1) so that tools comparing versions put them in the right order.

A new version is made with `node scripts/version.mjs --note "…" --apply`; without
`--apply` the script only shows the next version.

## What zotune does

### Looking up words
- One search box for Zolai and English, with no language switch.
- Words written joined, split or with a hyphen are found either way (itna, it na).
- Spellings that differ only in capitals and mean the same are one word
  (dawimangpa, Dawimangpa); those that mean different things point at each other
  (Pasian, God; pasian, god).
- English words in other forms open the Zolai for their root (loves → love,
  creatures → creature), using irregular forms, regular endings and Open English
  WordNet.
- Suggestions while typing, and on entering the box: recent words and words of
  the day.
- A query is read before it is looked up, and every kind gets a useful answer:
  - a word that is not a headword: nearest spellings, English forms and WordNet
    meanings, readings of its parts, words that start the same way;
  - a phrase or sentence: each word with its meaning, and example sentences that
    contain it;
  - a number: its English number words and their Zolai;
  - another script or a web address: what the dictionary reads instead;
  - symbols are left out, and the page says so.

### Definitions
- Meanings grouped by kind of word, with terms, explanation and remarks.
- How a word is built: base and suffix, joined words, a word written twice, and
  spelling notes from the patterns; otherwise a marked automatic reading.
- Other spellings, words built on the word, and words and phrases that contain it.
- Example sentences with the word marked, more on request and fewer again.
- Status of every meaning (low, draft, reviewed, confirmed, disputed), sources
  with Tedim Bible book names, origin and subject.
- For an English query, every Zolai word that has that English term.

### Taking part
- Bookmark and Like on every word.
- "Is this meaning correct?" and "Did it help you?" on every meaning.
- Suggest a change to an entry, or a new word.
- Everything is kept on the device first and queued until the zotune server is
  connected.

### Reading anywhere
- Works offline once the dictionary is downloaded; the core tables are about
  3.5 MB, example sentences and the English lexicon download when needed.
- The dictionary tables of laisiangtho/bible are read directly, at a pinned
  version; a new version is used only once it is fully downloaded.
- Light, dark and automatic themes.
- Every screen has its own address (/definition/itna); the desktop app also opens
  zotune:// links.
- A guide on the empty definition page that fits first-time and returning readers.
- Settings for appearance, bookmarks and likes, downloads and suggestions.

### Desktop
- Frameless Electron window with its own window controls; macOS keeps its native
  buttons.

## Versions

### v26.10.17.7 — 2026-10-17

- Example sources (Late 45:15, Zomi Daily…) are shown as small tags.
- In "How it is built", a part's meaning shows the terms that fit and a +N count for the rest; the full list is in the tooltip.
- After "No thanks" to usage statistics, a small chart button in the header reminds that they help; one click allows them, says so, and the button goes away. Never shown with Global Privacy Control or in the desktop app.

### v26.10.17.6 — 2026-10-17

- Privacy, Terms and Cookies are pages of their own (/privacy, /terms, /cookies), written as Markdown files in app/content and shown by a small reader in the app, with no dependency. Old About links lead there.
- The consent card is plainer: no icon, the title "Share usage statistics?" (distinct from About's "Help improve it"), and lighter rounded buttons.

### v26.10.17.5 — 2026-10-17

- The version is written only in package.json. The release build, npm run serve and the desktop app fill it into the page's application-name meta, and Settings reads it from there; app/version.json is gone.
- Usage statistics can be tested locally: with npm run serve the consent card and the switch work, and each event is printed in the browser console instead of being sent. ?analytics=send sends events marked as debug for GA's DebugView. Settings can show the consent card again.

### v26.10.17.4 — 2026-10-17

- Usage statistics with Google Analytics, only after consent: a card at the bottom right asks once (Allow / No thanks), Settings can change the choice, and the browser's Global Privacy Control signal keeps it off. Page views, searches (a single word and whether it was found; phrases and sentences without their text), bookmarks, likes and answers are counted; advertising features are off. Not used in the desktop app or in local development.
- About: the privacy and cookie text says what is collected and when.

### v26.10.17.3 — 2026-10-17

- Releases are built and deployed by GitHub Actions: a commit on master whose first line is "release: web" is tested, bundled with esbuild (hashed file names, generated service worker list) and deployed to Cloudflare. Other pushes only run the tests. Nothing built is committed.
- npm run build writes the production site to dist/web; npm run serve -- --dist serves it.

### v26.10.17.2 — 2026-10-17

- The logo on the home page and above definitions opens /definition, the guide to using the dictionary.

### v26.10.17.1 — 2026-10-17

- The page source shows which version was delivered: <meta name="application-name" content="zotune.com" data-version="…"> in index.html, kept current by scripts/version.mjs.

### v26.10.16.2 — 2026-10-16

- Links such as /definition/itna open directly on Cloudflare: wrangler.jsonc makes every address that is not a file load the app.
- /#/definition/itna opens the same page as /definition/itna, and the address changes to the plain form.

### v26.10.16.1 — 2026-10-16

- First numbered release, with everything listed above.
- Includes the work after the first merge (pull request #1 was merged with the
  first three commits only): the zotune.com wordmark, reading the real
  dictionary tables, English roots, themes, query kinds, the guide, Settings,
  and one result for spellings that differ only in capitals.
