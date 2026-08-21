-- CreateTable (join table for Group <-> User many-to-many teacher access)
CREATE TABLE "_GroupTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Перенос существующих единичных назначений преподавателя в join-таблицу,
-- чтобы не потерять данные при удалении колонки Group.teacherId.
INSERT INTO "_GroupTeachers" ("A", "B")
SELECT "id", "teacherId" FROM "Group" WHERE "teacherId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "_GroupTeachers_AB_unique" ON "_GroupTeachers"("A", "B");

-- CreateIndex
CREATE INDEX "_GroupTeachers_B_index" ON "_GroupTeachers"("B");

-- AddForeignKey
ALTER TABLE "_GroupTeachers" ADD CONSTRAINT "_GroupTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupTeachers" ADD CONSTRAINT "_GroupTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_teacherId_fkey";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "teacherId";
