// Runtime behaviour: OS-aware hero button, "always latest" refresh, scroll reveal.
import { API_URL, pickAssets, formatSize, formatDate, metaLine, type AssetKey, type ReleaseInfo } from '../lib/release';

type Os = 'windows' | 'macos' | 'linux';

const OS_ASSET: Record<Os, AssetKey> = { windows: 'windowsSetup', macos: 'macos', linux: 'linux' };
const OS_NAME: Record<Os, string> = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };

const root = document.documentElement;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => document.querySelectorAll<T>(sel);

function detect(): { os: Os | null; mobile: boolean } {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
  const ua = nav.userAgent || '';
  const p = nav.userAgentData?.platform || ua;
  const mobile =
    nav.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod|Mobi/i.test(ua) ||
    (/Mac/i.test(p) && nav.maxTouchPoints > 1); // iPadOS reports itself as a Mac
  if (mobile) return { os: null, mobile: true };
  if (/win/i.test(p)) return { os: 'windows', mobile };
  if (/mac/i.test(p)) return { os: 'macos', mobile };
  if (/linux|x11|cros/i.test(p)) return { os: 'linux', mobile };
  return { os: null, mobile };
}

const { os, mobile } = detect();
let info: ReleaseInfo = JSON.parse($('#release-data')?.textContent || 'null');

function renderHero() {
  const cta = $<HTMLAnchorElement>('#hero-cta');
  const label = $('#hero-cta-label');
  const meta = $('#hero-meta');
  if (!cta || !label || !meta) return;
  if (os) {
    const asset = info.assets[OS_ASSET[os]];
    cta.href = asset.url;
    label.textContent = `Descargar para ${OS_NAME[os]}`;
    meta.textContent = metaLine(info.version, asset.size);
    meta.hidden = false;
  } else {
    cta.href = '#descargas';
    label.textContent = mobile ? 'Ver descargas' : 'Elegir plataforma';
    meta.textContent = metaLine(info.version, null);
    meta.hidden = mobile;
  }
  const note = $('#mobile-note');
  if (note) note.hidden = !mobile;
}

function render() {
  (Object.keys(info.assets) as AssetKey[]).forEach((key) => {
    const a = info.assets[key];
    $$<HTMLAnchorElement>(`[data-dl="${key}"]`).forEach((el) => (el.href = a.url));
    $$(`[data-size="${key}"]`).forEach((el) => {
      const t = formatSize(a.size);
      el.textContent = t;
      el.hidden = !t;
    });
  });
  $$('[data-version]').forEach((el) => {
    el.textContent = info.version ? `v${info.version}` : '';
    el.hidden = !info.version;
  });
  $$('[data-date]').forEach((el) => {
    const d = formatDate(info.published);
    el.textContent = d;
    el.hidden = !d;
  });
  root.dataset.tag = info.tag || '';
  root.dataset.fallback = info.fallback ? '1' : '';
  renderHero();
}

// Mark the visitor's platform card.
if (os) $(`[data-platform="${os}"]`)?.classList.add('is-yours');
renderHero();

// Re-resolve the latest release in the browser (unauthenticated). Fails silently.
(async () => {
  try {
    const res = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const fresh = pickAssets(await res.json());
    if (!fresh) return;
    if (!info.fallback && fresh.tag === info.tag) return;
    info = fresh;
    render();
  } catch {
    /* keep the baked data */
  }
})();

// Scroll reveal (transform/opacity only).
const items = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('in'));
}

// Floating cards only animate while their layer is near the viewport.
const layers = $$('.fc-layer');
if ('IntersectionObserver' in window) {
  const lio = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('on', e.isIntersecting)),
    { rootMargin: '120px 0px' },
  );
  layers.forEach((el) => lio.observe(el));
} else {
  layers.forEach((el) => el.classList.add('on'));
}

// Copy buttons for install commands.
$$<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = $(btn.dataset.copy || '')?.textContent?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = '¡Copiado!';
    } catch {
      const range = document.createRange();
      const target = $(btn.dataset.copy || '');
      if (target) {
        range.selectNodeContents(target);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      btn.textContent = 'Selecciónalo y cópialo';
    }
    setTimeout(() => (btn.textContent = 'Copiar'), 2200);
  });
});
