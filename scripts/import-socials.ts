// Usage: npm run db:import-socials -- path/to/socials.json
// The file is a list of { "email", "github", "instagram" } taken from the club's socials form sheet. It is not kept in the repo.
// Only members who already have an account (matched by email) are updated, and only the links that clean up to a valid
// profile: a handle or a link with tracking parameters is fine, a "." or a link to another site is skipped.
// An empty or invalid cell never clears what is stored. Safe to re-run.
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { normalizeGithub, normalizeInstagram } from "../src/lib/member-profile";

type Row = { email?: string; github?: string; instagram?: string };

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass the path of the socials JSON file.");
  const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];

  let updated = 0;
  const notes: string[] = [];
  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user) {
      notes.push(`${email || "(no email)"}: no account with this email, skipped`);
      continue;
    }
    const github = normalizeGithub(row.github ?? "");
    const instagram = normalizeInstagram(row.instagram ?? "");
    if (!github) notes.push(`${user.name}: no usable GitHub link`);
    if (!instagram) notes.push(`${user.name}: no usable Instagram link`);
    const data = { ...(github ? { github } : {}), ...(instagram ? { instagram } : {}) };
    if (Object.keys(data).length === 0) continue;
    await prisma.user.update({ where: { id: user.id }, data });
    updated++;
  }
  console.log(`Updated ${updated} of ${rows.length} member(s).`);
  if (notes.length) console.log(notes.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
