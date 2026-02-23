import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../src', import.meta.url));
const forbiddenPattern = /import\.meta\.env\.[A-Z0-9_]*SERVICE_ROLE[A-Z0-9_]*/;

async function walk(dirPath, files = []) {
  const entries = await readdir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const fileStat = await stat(fullPath);
    if (fileStat.isDirectory()) {
      await walk(fullPath, files);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry)) files.push(fullPath);
  }
  return files;
}

async function run() {
  const files = await walk(root);
  const violations = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    if (forbiddenPattern.test(content)) {
      violations.push(file);
    }
  }

  if (violations.length > 0) {
    console.error('Env hygiene violation: SERVICE_ROLE em import.meta.env detectado no frontend:');
    for (const file of violations) console.error(`- ${file}`);
    process.exit(1);
  }

  console.log('Env hygiene OK: nenhum SERVICE_ROLE exposto no frontend.');
}

run().catch((error) => {
  console.error(`Falha ao validar env hygiene: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
