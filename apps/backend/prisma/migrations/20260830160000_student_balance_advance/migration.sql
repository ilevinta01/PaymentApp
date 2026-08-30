-- AlterTable
ALTER TABLE "IndividualLessonParticipant" ADD COLUMN     "paidFromBalance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "fundedFromBalance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "kind" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BalanceTransaction_tenantId_idx" ON "BalanceTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_studentId_idx" ON "BalanceTransaction"("studentId");

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

