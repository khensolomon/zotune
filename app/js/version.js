// The app version, from app/version.json (written by scripts/version.mjs).

let loading = null;

export function appVersion() {
  loading ??= fetch(new URL('../version.json', import.meta.url), { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`version.json: HTTP ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}
