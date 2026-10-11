// Usage: npm run db:import-members
// Copies members from the club's Google Form sheet into the User table and gives each one a login:
// username = register number, password = register number (stored hashed).
// Safe to re-run. Existing accounts (matched by email or register number) keep their role, points and
// any password that was already set; only a missing register number or password is filled in, and a
// valid LinkedIn link in the sheet replaces the stored one.
import { prisma } from "../src/lib/prisma";
import { toDbDomain } from "../src/lib/data-store";
import { getLiveMembers } from "../src/lib/live-members";
import { hashPassword } from "../src/lib/password";
import { normalizeLinkedin } from "../src/lib/member-profile";

async function main() {
  const members = await getLiveMembers();
  console.log(`Read ${members.length} member(s) from the sheet.`);

  // Two emails with the same register number are the same person: the later form answer wins.
  const byRegisterNo = new Map(members.map((m) => [m.registerNo, m]));
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const skipped: string[] = [];

  for (const m of byRegisterNo.values()) {
    const email = m.email.toLowerCase();
    const [byEmail, byReg] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { registerNo: m.registerNo } }),
    ]);

    if (byEmail && byReg && byEmail.id !== byReg.id) {
      skipped.push(`${m.registerNo}: the register number and the email belong to two different accounts`);
      continue;
    }
    const existing = byEmail ?? byReg;

    if (!existing) {
      await prisma.user.create({
        data: {
          name: m.name,
          email,
          registerNo: m.registerNo,
          passwordHash: hashPassword(m.registerNo),
          role: "MEMBER",
          domain: toDbDomain(m.domain) ?? "TECHNICAL",
          avatar: m.avatar || null,
          bio: m.bio || null,
          linkedin: m.linkedin || null,
        },
      });
      created++;
      continue;
    }

    const patch: { registerNo?: string; passwordHash?: string; linkedin?: string } = {};
    if (!existing.registerNo) patch.registerNo = m.registerNo;
    if (!existing.passwordHash) patch.passwordHash = hashPassword(existing.registerNo ?? m.registerNo);
    // A valid LinkedIn link in the sheet wins; an empty or invalid cell never clears what is stored.
    const linkedin = normalizeLinkedin(m.linkedin ?? "");
    if (linkedin && linkedin !== existing.linkedin) patch.linkedin = linkedin;
    if (Object.keys(patch).length === 0) {
      unchanged++;
      continue;
    }
    await prisma.user.update({ where: { id: existing.id }, data: patch });
    updated++;
  }

  console.log(`Created ${created}, updated ${updated} (register number / password / LinkedIn), left ${unchanged} as they were.`);
  if (skipped.length) console.log(`Skipped ${skipped.length}:\n  ${skipped.join("\n  ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
