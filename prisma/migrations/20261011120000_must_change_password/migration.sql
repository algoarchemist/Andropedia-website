-- Accounts still on the register-number password must pick their own at the next login.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- "scrypt$..." is the register-number scheme; "scrypt2$..." is a password the member chose.
UPDATE "User" SET "mustChangePassword" = true WHERE "passwordHash" LIKE 'scrypt$%';
