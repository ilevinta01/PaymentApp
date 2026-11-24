-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "retentionYears" INTEGER;

-- CreateTable
CREATE TABLE "DataErasureLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentLabel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataErasureLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataErasureLog_tenantId_idx" ON "DataErasureLog"("tenantId");

-- AddForeignKey
ALTER TABLE "DataErasureLog" ADD CONSTRAINT "DataErasureLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataErasureLog" ADD CONSTRAINT "DataErasureLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

