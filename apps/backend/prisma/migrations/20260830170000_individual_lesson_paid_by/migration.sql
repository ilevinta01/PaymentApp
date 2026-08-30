-- AlterTable
ALTER TABLE "IndividualLessonParticipant" ADD COLUMN     "paidById" TEXT;

-- AddForeignKey
ALTER TABLE "IndividualLessonParticipant" ADD CONSTRAINT "IndividualLessonParticipant_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

