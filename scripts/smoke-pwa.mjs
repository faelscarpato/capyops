import { readFile } from 'node:fs/promises';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkLocalServer() {
  const home = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert(home.status >= 200 && home.status < 400, `GET / retornou status ${home.status}`);
  const appConfig = await fetch(`${baseUrl}/app/config`, { redirect: 'manual' });
  assert(appConfig.status >= 200 && appConfig.status < 400, `GET /app/config retornou status ${appConfig.status}`);
}

async function checkManifestHttp() {
  const response = await fetch(`${baseUrl}/manifest.webmanifest`);
  assert(response.ok, `GET /manifest.webmanifest retornou status ${response.status}`);
  const manifest = await response.json();
  assert(manifest.start_url === '/', `manifest.start_url inválido: ${String(manifest.start_url)}`);
  assert(manifest.scope === '/', `manifest.scope inválido: ${String(manifest.scope)}`);
}

async function checkManifestSource() {
  const text = await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8');
  const manifest = JSON.parse(text);
  assert(manifest.start_url === '/', `public/manifest.webmanifest start_url inválido: ${String(manifest.start_url)}`);
  assert(manifest.scope === '/', `public/manifest.webmanifest scope inválido: ${String(manifest.scope)}`);
}

async function run() {
  await checkManifestSource();
  await checkLocalServer();
  await checkManifestHttp();
  console.log(`Smoke PWA OK em ${baseUrl}`);
}

run().catch((error) => {
  console.error(`Smoke PWA falhou: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
