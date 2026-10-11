// Usage: npm run user:set-register-no -- <email> <register number> [password]
// Gives an existing account (for example a super admin who is not in the Google Form sheet) a login.
// The password defaults to the register number.
import { prisma } from "../src/lib/prisma";
import { hashChosenPassword, hashPassword, normalizeRegisterNo } from "../src/lib/password";

async function main() {
  const [emailArg, regArg, password] = process.argv.slice(2);
  const email = emailArg?.toLowerCase();
  if (!email || !regArg) throw new Error("Usage: npm run user:set-register-no -- <email> <register number> [password]");

  const registerNo = normalizeRegisterNo(regArg);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account with the email ${email}. Create it first with npm run user:set-role.`);
  const taken = await prisma.user.findUnique({ where: { registerNo } });
  if (taken && taken.id !== user.id) throw new Error(`${registerNo} already belongs to another account.`);

  await prisma.user.update({ where: { id: user.id }, data: { registerNo, passwordHash: password ? hashChosenPassword(password) : hashPassword(registerNo), mustChangePassword: true } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(`${email} can now log in with register number ${registerNo}${password ? " and the password you gave" : " (password = register number)"}, and will be asked to choose a new password at once.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
