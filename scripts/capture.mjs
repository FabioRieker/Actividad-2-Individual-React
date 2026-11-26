// Captura de evidencia: arranca vite, abre la app con emulación Pixel 7 y guarda un PNG.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';

const PORT = 5173;
const URL = `http://localhost:${PORT}/`;
const OUT = 'evidence/tarea1/ionic-serve.png';

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

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'inherit' });
try {
  await waitFor(URL, 60_000);
  await mkdir('evidence/tarea1', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  await page.goto(URL);
  await page.getByText('Recepción, inspección y clasificación de paquetes.').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log(`Captura guardada en ${OUT}`);
} finally {
  server.kill('SIGTERM');
}
