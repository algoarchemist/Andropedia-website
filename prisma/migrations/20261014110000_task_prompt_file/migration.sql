-- CreateTable
CREATE TABLE "TaskPromptFile" (
    "promptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskPromptFile_pkey" PRIMARY KEY ("promptId")
);

-- AddForeignKey
ALTER TABLE "TaskPromptFile" ADD CONSTRAINT "TaskPromptFile_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "TaskPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same policy as every other table: RLS on with no policies, so only the app (database owner) can use it.
ALTER TABLE "TaskPromptFile" ENABLE ROW LEVEL SECURITY;
