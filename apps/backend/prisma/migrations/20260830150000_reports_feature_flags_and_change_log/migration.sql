-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "isChangeLogEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDebtorsReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isIndividualDebtorsReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaymentsReportEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "IndividualLessonLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "studentNames" TEXT NOT NULL,
    "lessonStartAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2),
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualLessonLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndividualLessonLog_tenantId_idx" ON "IndividualLessonLog"("tenantId");

-- AddForeignKey
ALTER TABLE "IndividualLessonLog" ADD CONSTRAINT "IndividualLessonLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualLessonLog" ADD CONSTRAINT "IndividualLessonLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

