// Deep links: zotune://definition/itna opens the app at /definition/itna.

'use strict';

const DEEP_LINK = 'zotune';

/** Converts a zotune:// link into an in-app path, or null if it is not one. */
function deepLinkPath(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== `${DEEP_LINK}:`) return null;
  const p = `/${url.host}${url.pathname}`.replace(/\/+$/, '') || '/';
  return p + url.search;
}

module.exports = { DEEP_LINK, deepLinkPath };
