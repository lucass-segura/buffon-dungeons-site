// Release resolution shared by the build (Astro frontmatter) and the browser (inline script).
// Everything here is pure except `fetchLatest`, which only needs a global `fetch`.

export const REPO = 'lucass-segura/buffon-dungeons-releases';
export const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
export const LATEST_URL = `https://github.com/${REPO}/releases/latest`;
export const ALL_RELEASES_URL = `https://github.com/${REPO}/releases`;

export type AssetKey = 'windowsSetup' | 'windowsZip' | 'macos' | 'linux' | 'sums';

export interface Asset {
  url: string;
  /** Size in bytes, or null when unknown (fallback). */
  size: number | null;
}

export interface ReleaseInfo {
  tag: string | null;
  version: string | null;
  published: string | null;
  /** True when the data could not be resolved and every URL points to /releases/latest. */
  fallback: boolean;
  assets: Record<AssetKey, Asset>;
}

// Names embed the version, so match on the suffix instead of an exact name.
const MATCHERS: Record<AssetKey, RegExp> = {
  windowsSetup: /^Buffon-Dungeons-.+-windows-setup\.exe$/i,
  windowsZip: /^Buffon-Dungeons-.+-windows\.zip$/i,
  macos: /^Buffon-Dungeons-.+-macos\.dmg$/i,
  linux: /^Buffon-Dungeons-.+-linux-x86_64\.tar\.gz$/i,
  sums: /^SHA256SUMS$/,
};

const KEYS = Object.keys(MATCHERS) as AssetKey[];

export function fallbackInfo(): ReleaseInfo {
  const assets = {} as Record<AssetKey, Asset>;
  for (const k of KEYS) assets[k] = { url: LATEST_URL, size: null };
  return { tag: null, version: null, published: null, fallback: true, assets };
}

/** Turns a GitHub "latest release" payload into the data the page needs. Returns null if unusable. */
export function pickAssets(release: any): ReleaseInfo | null {
  if (!release || typeof release.tag_name !== 'string' || !Array.isArray(release.assets)) return null;
  const info = fallbackInfo();
  let found = 0;
  for (const key of KEYS) {
    const a = release.assets.find((x: any) => typeof x?.name === 'string' && MATCHERS[key].test(x.name));
    if (a && typeof a.browser_download_url === 'string') {
      info.assets[key] = { url: a.browser_download_url, size: typeof a.size === 'number' ? a.size : null };
      if (key !== 'sums') found++;
    }
  }
  if (found === 0) return null;
  info.tag = release.tag_name;
  info.version = release.tag_name.replace(/^v/i, '');
  info.published = typeof release.published_at === 'string' ? release.published_at : null;
  info.fallback = false;
  return info;
}

export function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  return `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export async function fetchLatest(token?: string): Promise<ReleaseInfo | null> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_URL, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  return pickAssets(await res.json());
}

/** "Versión 0.1.0 · 34 MB · Gratis" with unknown parts left out. */
export function metaLine(version: string | null, bytes: number | null): string {
  const parts: string[] = [];
  if (version) parts.push(`Versión ${version}`);
  const size = formatSize(bytes);
  if (size) parts.push(size);
  parts.push("Gratis");
  return parts.join(" · ");
}
