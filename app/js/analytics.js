// Usage statistics through Google Analytics, only with consent.
//
// Google's script is not requested and nothing is sent until the visitor
// allows it (the consent card, or Settings). It stays off without a choice,
// after "No thanks", when the browser sends the Global Privacy Control signal,
// in the desktop app, and outside https (local development).
//
// What is sent: page views (results that are not headwords are reported under
// a placeholder path, so typed text does not travel in the address), and the
// events search, bookmark, like and vote. A search term is included only when
// it is a single word of at most 32 characters; phrases, sentences and other
// input are counted by kind alone. Advertising features stay denied.

export const MEASUREMENT_ID = 'G-WFTW2GJVFJ';
const KEY = 'zotune.analytics';
const SCRIPT = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
const TERM_MAX = 32;

/** Whether this copy of the app may send statistics at all. */
export function available({ protocol, desktop }) {
  return protocol === 'https:' && !desktop;
}

/** The effective choice: 'granted', 'denied' or null (not asked yet). */
export function choiceFrom(stored, gpc) {
  if (gpc) return 'denied';
  return stored === 'granted' || stored === 'denied' ? stored : null;
}

/** The search term to report for a classified query, or null. */
export function reportableTerm(q) {
  if (q.kind !== 'word') return null;
  const term = q.clean;
  if (!term || term.length > TERM_MAX || /\s/.test(term)) return null;
  return term;
}

/** The path reported for a definition that is not a headword. */
export function placeholderPath(q) {
  if (q.kind === 'word') return '/definition/(not found)';
  if (q.kind === 'phrase' || q.kind === 'sentence' || q.kind === 'number') return `/definition/(${q.kind})`;
  return '/definition/(other)';
}

/* ---------- Browser side ---------- */

const changes = new EventTarget();
let loaded = false;
let version = null;
// The page in view, so that allowing statistics on it counts it once.
let current = null;

function env() {
  return { protocol: location.protocol, desktop: Boolean(window.zotune) };
}

function stored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The current choice in this browser. */
export function choice() {
  return choiceFrom(stored(), navigator.globalPrivacyControl === true);
}

/** Whether the consent card should be shown. */
export function needsAsking() {
  return available(env()) && choice() === null;
}

/** Whether the choice can be changed here (Settings hides the switch otherwise). */
export function changeable() {
  return available(env()) && navigator.globalPrivacyControl !== true;
}

function gtag() {
  // gtag.js reads the arguments object itself, not an array.
  window.dataLayer.push(arguments);
}

function load() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, app_version: version ?? undefined });
  const s = document.createElement('script');
  s.async = true;
  s.src = SCRIPT;
  // A blocker refusing the script is the visitor's decision, not an app fault.
  s.onerror = () => console.warn('zotune: Google Analytics did not load (blocked or offline); nothing is sent.');
  document.head.append(s);
}

function clearCookies() {
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n === '_ga' || n.startsWith('_ga_'));
  const parts = location.hostname.split('.');
  for (const name of names) {
    for (let i = 0; i < parts.length; i++) {
      const domain = parts.slice(i).join('.');
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
    }
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}

/** Records the visitor's choice and applies it at once. */
export function setChoice(value) {
  if (value !== 'granted' && value !== 'denied') throw new Error(`Unknown analytics choice: ${value}`);
  try {
    localStorage.setItem(KEY, value);
  } catch (err) {
    console.warn('zotune: the analytics choice could not be saved:', err.message);
  }
  if (value === 'granted' && available(env())) {
    load();
    if (current) pageView(current.path, current.title);
  }
  if (value === 'denied') {
    if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    clearCookies();
  }
  changes.dispatchEvent(new Event('change'));
}

export function onChange(fn) {
  changes.addEventListener('change', fn);
  return () => changes.removeEventListener('change', fn);
}

const on = () => loaded && choice() === 'granted';

/** Starts statistics at boot when they were allowed on an earlier visit. */
export function start() {
  if (available(env()) && choice() === 'granted') load();
}

/** Adds the app version to everything sent from now on. */
export function setVersion(value) {
  version = value;
  if (loaded) gtag('set', { app_version: value });
}

export function pageView(path, title) {
  current = { path, title };
  if (on()) gtag('event', 'page_view', { page_location: location.origin + path, page_title: title });
}

export function track(name, params = {}) {
  if (on()) gtag('event', name, params);
}
