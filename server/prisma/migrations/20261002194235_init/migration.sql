-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('TECHNICAL', 'WEB_DEV', 'MEDIA', 'PR', 'DESIGN', 'RND');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('CSE', 'CC', 'BDA', 'IOT', 'CSBS', 'CYBERSECURITY', 'AI', 'AIML', 'GT', 'IT', 'ECE', 'ECE_DS', 'EEE', 'BIOTECH', 'BIOMEDICAL', 'CIVIL', 'MECHANICAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "name" TEXT NOT NULL,
    "registerNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "section" TEXT NOT NULL,
    "domainPref1" "Domain" NOT NULL,
    "domainPref2" "Domain" NOT NULL,
    "aboutYou" TEXT NOT NULL,
    "whyDomain" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "techStack" TEXT[],
    "outsideAcademics" TEXT NOT NULL,
    "whyAndropedia" TEXT NOT NULL,
    "oneYearVision" TEXT NOT NULL,
    "workUrl" TEXT NOT NULL,
    "portfolioUrl" TEXT,
    "achievements" JSONB NOT NULL,
    "photoId" TEXT NOT NULL,
    "hoursPerWeek" INTEGER NOT NULL,
    "responsibility" INTEGER NOT NULL,
    "inOtherClub" BOOLEAN NOT NULL,
    "otherClubs" TEXT,
    "clubShouldProvide" TEXT NOT NULL,
    "rememberUs" TEXT NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_registerNumber_key" ON "Application"("registerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Application_email_key" ON "Application"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_photoId_key" ON "Application"("photoId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
