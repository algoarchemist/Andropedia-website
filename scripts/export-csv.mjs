// ADM-01: saves every application as a CSV for the admins, through the token-protected export endpoint.
//   npm run export:csv                                  local API, token from .env
//   npm run export:csv -- https://<api>.onrender.com    production API (ADMIN_EXPORT_TOKEN from the environment or .env)
// Files land in exports/, which git ignores: they hold applicants' personal data.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  process.loadEnvFile('.env');
} catch {
  /* no .env file, rely on the environment */
}

const base = process.argv[2] ?? 'http://127.0.0.1:4000';
const token = process.env.ADMIN_EXPORT_TOKEN;
if (!token) {
  console.error('ADMIN_EXPORT_TOKEN is not set (in .env or the environment).');
  process.exit(1);
}

const res = await fetch(new URL('/api/admin/applications.csv', base), { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.error(`Export failed: HTTP ${res.status} from ${base}`);
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync('exports', { recursive: true });
const file = join('exports', `applications-${stamp}.csv`);
writeFileSync(file, Buffer.from(await res.arrayBuffer()));
console.log(`Saved ${file}`);
