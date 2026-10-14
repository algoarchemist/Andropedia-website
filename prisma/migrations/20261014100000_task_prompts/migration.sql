-- CreateTable
CREATE TABLE "TaskPrompt" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "domain" "Domain" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resourceUrl" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskPrompt_domain_idx" ON "TaskPrompt"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "TaskPrompt_weekId_domain_key" ON "TaskPrompt"("weekId", "domain");

-- AddForeignKey
ALTER TABLE "TaskPrompt" ADD CONSTRAINT "TaskPrompt_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same policy as every other table: RLS on with no policies, so only the app (database owner) can use it.
ALTER TABLE "TaskPrompt" ENABLE ROW LEVEL SECURITY;
