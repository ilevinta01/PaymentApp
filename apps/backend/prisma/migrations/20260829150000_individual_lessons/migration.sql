-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "isIndividualLessonsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "individualLessonRate" DECIMAL(10,2),
ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "IndividualLesson" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "hourlyRateSnapshot" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualLessonParticipant" (
    "id" TEXT NOT NULL,
    "individualLessonId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "shareAmount" DECIMAL(10,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "IndividualLessonParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndividualLesson_tenantId_idx" ON "IndividualLesson"("tenantId");

-- CreateIndex
CREATE INDEX "IndividualLesson_teacherId_idx" ON "IndividualLesson"("teacherId");

-- CreateIndex
CREATE INDEX "IndividualLessonParticipant_individualLessonId_idx" ON "IndividualLessonParticipant"("individualLessonId");

-- CreateIndex
CREATE INDEX "IndividualLessonParticipant_studentId_idx" ON "IndividualLessonParticipant"("studentId");

-- AddForeignKey
ALTER TABLE "IndividualLesson" ADD CONSTRAINT "IndividualLesson_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualLesson" ADD CONSTRAINT "IndividualLesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualLesson" ADD CONSTRAINT "IndividualLesson_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualLessonParticipant" ADD CONSTRAINT "IndividualLessonParticipant_individualLessonId_fkey" FOREIGN KEY ("individualLessonId") REFERENCES "IndividualLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualLessonParticipant" ADD CONSTRAINT "IndividualLessonParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

