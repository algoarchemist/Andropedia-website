import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env on its own. Real env vars win over the repo-root file.
try {
  process.loadEnvFile('../.env');
} catch {
  /* no .env file */
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // A placeholder keeps `prisma generate` working without a database (typecheck, CI).
  datasource: { url: process.env['DATABASE_URL'] ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder' },
});
