// Sonda de accesibilidad: arranca vite preview (tras `npm run build`) y comprueba a 320 px,
// en tema claro y oscuro: anchura de controles, contraste del placeholder, nombre accesible
// del campo de búsqueda, estructura de lista y foco/anuncio tras activar un botón por teclado.
// Uso: node scripts/a11y-probe.mjs   (sale con código 1 si alguna comprobación falla)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = 4173;
const APP_URL = `http://localhost:${PORT}/`;
const VIEWPORT = { width: 320, height: 640 };

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // servidor aún no disponible
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timeout esperando ${url}`);
}

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`  [${ok ? 'OK' : 'FALLO'}] ${name}: ${detail}`);
}

// Se ejecuta en la página: resuelve colores con un canvas y calcula la razón de contraste WCAG.
function measure() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bar = document.querySelector('ion-searchbar');
  const input = bar.querySelector('input');
  const ph = getComputedStyle(input, '::placeholder');
  const bgCss = getComputedStyle(document.documentElement).getPropertyValue('--lt-surface-3').trim();
  const bg = rgba(bgCss);
  const fg = rgba(ph.color);
  const alpha = fg.a * Number(ph.opacity || 1);
  const blended = {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  };
  const l1 = lum(blended);
  const l2 = lum(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const segment = document.querySelector('ion-segment');
  const list = document.querySelector('ion-list[role="list"]');
  const items = list ? [...list.querySelectorAll('[role="listitem"]')] : [];
  return {
    placeholderColor: ph.color,
    placeholderOpacity: ph.opacity,
    background: bgCss,
    ratio: Math.round(ratio * 100) / 100,
    searchbarWidth: Math.round(bar.getBoundingClientRect().width),
    segmentWidth: Math.round(segment.getBoundingClientRect().width),
    segmentScrollWidth: segment.scrollWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    inputAriaLabel: input.getAttribute('aria-label'),
    inputName: input.labels?.[0]?.textContent ?? null,
    listItems: items.length,
    nestedListItems: items.filter((i) => i.parentElement?.closest('[role="listitem"]')).length,
    slidingWithRole: list ? list.querySelectorAll('ion-item-sliding[role]').length : -1,
  };
}

try {
  await waitFor(APP_URL, 60_000);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const scheme of ['light', 'dark']) {
    console.log(`\n== Tema ${scheme} a ${VIEWPORT.width} px ==`);
    const context = await browser.newContext({ viewport: VIEWPORT, colorScheme: scheme, locale: 'es-ES' });
    const page = await context.newPage();
    await page.goto(APP_URL);
    await page.getByText('Recepción, inspección y clasificación de paquetes.').waitFor();
    await page.waitForTimeout(600);
    const m = await page.evaluate(measure);
    console.log(`  datos: ${JSON.stringify(m)}`);
    check('searchbar dentro del viewport', m.searchbarWidth <= m.viewport, `${m.searchbarWidth} <= ${m.viewport}`);
    check('segment dentro del viewport', m.segmentWidth <= m.viewport, `${m.segmentWidth} <= ${m.viewport}`);
    check('sin desbordamiento horizontal', m.docScrollWidth <= m.viewport, `${m.docScrollWidth} <= ${m.viewport}`);
    check(
      'contraste del placeholder >= 4.5',
      m.ratio >= 4.5,
      `${m.ratio}:1 (${m.placeholderColor}, opacidad ${m.placeholderOpacity})`,
    );
    check('aria-label del input en español', m.inputAriaLabel === 'Buscar código o destino', `"${m.inputAriaLabel}"`);
    check(
      'listitem sin anidar',
      m.listItems > 0 && m.nestedListItems === 0 && m.slidingWithRole === 0,
      `${m.listItems} items, ${m.nestedListItems} anidados, ${m.slidingWithRole} sliding con role`,
    );

    // Foco tras activar el botón por teclado (primer paquete en tránsito)
    const btn = page.locator('article[data-status="transit"] ion-button.lt-btn-inspect').first();
    const native = btn.locator('button');
    const label = await native.getAttribute('aria-label');
    console.log(`  botón objetivo: "${label}"`);
    await native.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const a = document.activeElement;
      const inner = a?.shadowRoot?.querySelector('button') ?? null;
      return {
        tag: a?.tagName ?? null,
        label: inner?.getAttribute('aria-label') ?? a?.getAttribute('aria-label') ?? null,
        ariaDisabled: inner?.getAttribute('aria-disabled') ?? a?.getAttribute('aria-disabled') ?? null,
        nativeDisabled: inner?.disabled ?? null,
      };
    });
    check(
      'foco conservado en el botón',
      after.tag === 'ION-BUTTON' && after.label === label,
      `${JSON.stringify(after)}`,
    );
    check(
      'botón con aria-disabled (sin disabled nativo)',
      after.ariaDisabled === 'true' && after.nativeDisabled === false,
      `aria-disabled=${after.ariaDisabled}, disabled=${after.nativeDisabled}`,
    );
    const status = await page
      .locator('.lt-sr-only[role="status"]')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    const code = label?.match(/LTK-\S+/)?.[0] ?? '';
    check(
      'anuncio en la región de estado',
      Boolean(code) && status?.includes(`${code} marcado como inspeccionado`) === true,
      `"${status}"`,
    );
    await context.close();
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
console.log(
  `\nResultado: ${failures === 0 ? 'todas las comprobaciones correctas' : `${failures} comprobaciones fallidas`}`,
);
process.exitCode = failures === 0 ? 0 : 1;
