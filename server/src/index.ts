import { createApp } from './app';
import { loadConfig } from './config';
import { createPrismaDb } from './db.prisma';
import { createStorage } from './storage';

// Local dev convenience: the repo-root .env. Real env vars always win.
try {
  process.loadEnvFile('../.env');
} catch {
  /* no .env file, rely on the environment */
}

const config = loadConfig();
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const app = createApp({ config, db: createPrismaDb(databaseUrl), storage: createStorage(config) }, { log: true });

app.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
