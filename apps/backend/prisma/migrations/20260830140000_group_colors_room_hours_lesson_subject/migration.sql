-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#6366f1';

-- AlterTable
ALTER TABLE "IndividualLesson" ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "workingHoursEnd" TEXT NOT NULL DEFAULT '21:00',
ADD COLUMN     "workingHoursStart" TEXT NOT NULL DEFAULT '09:00';

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "individualLessonColor" TEXT NOT NULL DEFAULT '#f59e0b';

