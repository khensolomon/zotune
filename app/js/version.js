// The app version, as the page carries it in its application-name meta.
// The release build, the development server and the desktop app fill it in
// from package.json (desktop/app-version.js); app/index.html leaves it empty.

export function appVersion() {
  const version = document.querySelector('meta[name="application-name"]')?.dataset.version;
  if (!version) throw new Error('this page carries no version (it was not served by npm run serve, the desktop app or a release build)');
  const m = /^(\d{2})\.(\d{2})\.(\d{2})\.\d+$/.exec(version);
  if (!m) throw new Error(`the page carries an invalid version: ${version}`);
  return { version, date: `20${m[1]}-${m[2]}-${m[3]}` };
}
