import { prisma } from "./prisma";

// What the code needs from the database, newest migrations last. If the app is deployed before `npm run db:deploy`, these are
// what is missing, and /api/health says so instead of the site failing in odd places (photos, password change).
const REQUIRED_TABLES = ["User", "Session", "Event", "RateLimit", "MemberPhoto", "EventImage", "AttendanceSession", "AttendanceRecord", "TaskPrompt", "TaskPromptFile"] as const;
const REQUIRED_COLUMNS: Array<[table: string, column: string]> = [["User", "mustChangePassword"]];

/** Plain-language problems with the database layout; empty when it is up to date. Never throws. */
export async function schemaProblems(): Promise<string[]> {
  try {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const have = new Set(tables.map((t) => t.table_name));
    const missingTables = REQUIRED_TABLES.filter((t) => !have.has(t));

    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY(${REQUIRED_COLUMNS.map(([t]) => t)})`;
    const haveColumns = new Set(columns.map((c) => `${c.table_name}.${c.column_name}`));
    const missingColumns = REQUIRED_COLUMNS.filter(([t, c]) => !haveColumns.has(`${t}.${c}`)).map(([t, c]) => `${t}.${c}`);

    const missing = [...missingTables.map((t) => `table ${t}`), ...missingColumns.map((c) => `column ${c}`)];
    return missing.length ? [`Database migrations are missing (${missing.join(", ")}). Run \`npm run db:deploy\` against this database.`] : [];
  } catch {
    return []; // an unreachable database is reported separately by the health check
  }
}
