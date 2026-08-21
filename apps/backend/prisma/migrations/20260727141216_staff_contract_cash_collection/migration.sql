-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "contractFileUrl" TEXT,
ADD COLUMN     "contractUploadedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "CashCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "collectedById" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashCollection_tenantId_idx" ON "CashCollection"("tenantId");

-- CreateIndex
CREATE INDEX "CashCollection_teacherId_idx" ON "CashCollection"("teacherId");

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
