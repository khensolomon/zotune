// The app version. package.json is the only place it is written; everything
// else is derived from it here.
//
// package.json holds YY.MMDD.N (valid semver that orders correctly); the app
// shows YY.MM.DD.N, and the release date is the 20YY-MM-DD it encodes. The
// page carries the version in
// <meta name="application-name" content="zotune.com" data-version="…">,
// which app/index.html leaves empty and whoever serves the page fills in: the
// release build, the development server and the desktop app.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const META_EMPTY = '<meta name="application-name" content="zotune.com" data-version="">';
const META = /<meta name="application-name" content="zotune\.com" data-version="([^"]*)">/g;

/** 26.10.17.4 → 26.1017.4 */
function toSemver(version) {
  const m = /^(\d{2})\.(\d{2})\.(\d{2})\.(\d+)$/.exec(version);
  if (!m) throw new Error(`Not a version of the form YY.MM.DD.N: ${version}`);
  return `${Number(m[1])}.${Number(m[2] + m[3])}.${Number(m[4])}`;
}

/** 26.1017.4 → 26.10.17.4 */
function fromSemver(semver) {
  const m = /^(\d{1,2})\.(\d{1,4})\.(\d+)$/.exec(String(semver));
  if (!m) throw new Error(`package.json version is not of the form YY.MMDD.N: ${semver}`);
  const mmdd = m[2].padStart(4, '0');
  const month = Number(mmdd.slice(0, 2));
  const day = Number(mmdd.slice(2));
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`package.json version ${semver} does not encode a date (month ${month}, day ${day}).`);
  return `${m[1].padStart(2, '0')}.${mmdd.slice(0, 2)}.${mmdd.slice(2)}.${m[3]}`;
}

/** 26.10.17.4 → 2026-10-17 */
function releaseDate(version) {
  const m = /^(\d{2})\.(\d{2})\.(\d{2})\.\d+$/.exec(version);
  if (!m) throw new Error(`Not a version of the form YY.MM.DD.N: ${version}`);
  return `20${m[1]}-${m[2]}-${m[3]}`;
}

/** The version in package.json under `root`, as YY.MM.DD.N. */
function appVersion(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return fromSemver(pkg.version);
}

/** index.html with the version filled in; the empty meta must be there exactly once. */
function stampHtml(html, version) {
  const found = html.split(META_EMPTY).length - 1;
  if (found !== 1) throw new Error(`app/index.html must hold exactly one ${META_EMPTY}; found ${found}.`);
  return html.replace(META_EMPTY, `<meta name="application-name" content="zotune.com" data-version="${version}">`);
}

module.exports = { META, toSemver, fromSemver, releaseDate, appVersion, stampHtml };
