// Captura de evidencia de las páginas nuevas (Pixel 7): arranca vite y guarda un PNG por página.
// Uso: node scripts/capture-paginas.mjs [directorio-salida] [dispositivo]
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = process.argv[2] ?? 'evidence/paginas';
const DEVICE = process.argv[3] ?? 'Pixel 7';

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // servidor aún no disponible
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout esperando ${url}`);
}

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], { stdio: 'inherit' });
try {
  await waitFor(`${BASE_URL}/`, 60_000);
  await mkdir(OUT_DIR, { recursive: true });
  const descriptor = devices[DEVICE];
  if (!descriptor) throw new Error(`Dispositivo desconocido: ${DEVICE}`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ ...descriptor });
  const page = await context.newPage();

  const shot = async (name) => {
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, `${name}.png`) });
    console.log(`Captura guardada: ${join(OUT_DIR, `${name}.png`)}`);
  };

  await page.goto(`${BASE_URL}/`);
  await page.getByRole('heading', { level: 1, name: 'Listado de paquetes' }).waitFor({ state: 'attached' });
  await shot('paquetes');

  // Detalle del primer paquete, con un cambio de estado para que la línea de tiempo tenga contenido.
  await page.getByRole('button', { name: 'Marcar LTK-0001-ES como inspeccionado' }).click();
  await page.locator('ion-router-link', { hasText: 'LTK-0001-ES' }).click();
  await page.getByRole('heading', { level: 1, name: 'LTK-0001-ES' }).waitFor();
  await shot('detalle');

  await page.locator('ion-tab-button', { hasText: 'Resumen' }).click();
  await page.getByRole('heading', { level: 1, name: 'Resumen' }).waitFor();
  await shot('resumen');

  await page.locator('ion-tab-button', { hasText: 'Actividad' }).click();
  await page.getByRole('heading', { level: 1, name: 'Actividad' }).waitFor();
  await shot('actividad');

  await page.locator('ion-tab-button', { hasText: 'Ajustes' }).click();
  await page.getByRole('heading', { level: 1, name: 'Ajustes' }).waitFor();
  await shot('ajustes');

  await browser.close();
} finally {
  server.kill('SIGTERM');
}
