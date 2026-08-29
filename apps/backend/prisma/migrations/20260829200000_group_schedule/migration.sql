-- CreateTable
CREATE TABLE "GroupScheduleSlot" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,

    CONSTRAINT "GroupScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupScheduleSlot_groupId_idx" ON "GroupScheduleSlot"("groupId");

-- AddForeignKey
ALTER TABLE "GroupScheduleSlot" ADD CONSTRAINT "GroupScheduleSlot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

