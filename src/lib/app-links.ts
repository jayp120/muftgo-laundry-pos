/**
 * Single source of truth for app distribution links (PWA + Android APK).
 *
 * Why two APK URLs: muftgo.com currently serves the MuftGo marketing site,
 * not this POS app, so https://muftgo.com/muftgo-laundry-latest.apk 404s until
 * the marketing site hosts the file or DNS points here. The GitHub Releases
 * URL always works once a tagged release exists, so it is the primary.
 * The same-origin short link is kept as a convenience alias via vercel.json
 * redirect for deployments where this app owns the domain.
 */

export const GITHUB_REPO = 'jayp120/muftgo-laundry-pos';

export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

export const APK_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/muftgo-laundry-latest.apk`;

/** Same-origin alias (vercel.json 302 -> GitHub). Works only when this app serves the domain. */
export const APK_SHORT_URL = '/muftgo-laundry-latest.apk';
