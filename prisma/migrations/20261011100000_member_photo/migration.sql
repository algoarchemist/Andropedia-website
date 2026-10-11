-- CreateTable
CREATE TABLE "MemberPhoto" (
    "userId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPhoto_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "MemberPhoto" ADD CONSTRAINT "MemberPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same policy as every other table: RLS on with no policies, so only the app (database owner) can use it.
ALTER TABLE "MemberPhoto" ENABLE ROW LEVEL SECURITY;
