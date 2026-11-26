// Captura de evidencia: arranca vite, abre la app con un dispositivo emulado y guarda un PNG.
// Uso: node scripts/capture.mjs [ruta-salida.png] [dispositivo]  (por defecto Pixel 7)
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const PORT = 5173;
const APP_URL = `http://localhost:${PORT}/`;
const OUT = process.argv[2] ?? 'evidence/tarea1/ionic-serve.png';
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

// Se lanza vite con node directamente (sin npx) para que SIGTERM llegue al servidor y no quede huérfano.
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], { stdio: 'inherit' });
try {
  await waitFor(APP_URL, 60_000);
  await mkdir(dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const descriptor = devices[DEVICE];
  if (!descriptor) throw new Error(`Dispositivo desconocido: ${DEVICE}`);
  const context = await browser.newContext({ ...descriptor });
  const page = await context.newPage();
  await page.goto(APP_URL);
  await page.getByText('Recepción, inspección y clasificación de paquetes.').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log(`Captura guardada en ${OUT}`);
} finally {
  server.kill('SIGTERM');
}
