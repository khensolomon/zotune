// History API router. Paths are real URLs so any route can be linked to,
// bookmarked or opened from outside the app.

const routes = [];
let handler = () => {};

/** Registers a route. Pattern segments starting with `:` are parameters. */
export function route(pattern, view) {
  const names = [];
  const source = pattern
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        names.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ re: new RegExp(`^${source}/?$`), names, view });
}

export function match(pathname) {
  for (const r of routes) {
    const m = r.re.exec(pathname);
    if (m) {
      const params = {};
      r.names.forEach((name, i) => {
        params[name] = decodeURIComponent(m[i + 1]);
      });
      return { view: r.view, params };
    }
  }
  return null;
}

function current() {
  return { path: location.pathname, params: new URLSearchParams(location.search) };
}

/** Navigates to a path inside the app. */
export function navigate(path, { replace = false } = {}) {
  const url = new URL(path, location.origin);
  if (url.origin !== location.origin) {
    location.assign(url.href);
    return;
  }
  const target = url.pathname + url.search + url.hash;
  if (target === location.pathname + location.search + location.hash && !replace) return;
  history[replace ? 'replaceState' : 'pushState']({}, '', target);
  handler(current());
}

export const definitionPath = (word) => `/definition/${encodeURIComponent(word)}`;

export function start(onRoute) {
  handler = onRoute;
  window.addEventListener('popstate', () => handler(current()));
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = event.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (/^\/(assets|css|data|fonts|js)\//.test(url.pathname)) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
  handler(current());
}
