import { PrismaClient, Role, StudentStatus, SubscriptionStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const paidUntil = new Date();
  paidUntil.setMonth(paidUntil.getMonth() + 1, 0); // последний день текущего месяца

  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: {
      id: "demo-tenant",
      name: 'Демо детский центр "Радуга"',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionPaidUntil: paidUntil,
      settings: { create: { isCardEnabled: false } },
    },
  });

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.local",
      passwordHash: adminPasswordHash,
      fullName: "Иван Владельцев",
      role: Role.SUPER_ADMIN,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@demo.local" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "teacher@demo.local",
      passwordHash: teacherPasswordHash,
      fullName: "Мария Преподавателева",
      role: Role.TEACHER,
    },
  });

  const group = await prisma.group.upsert({
    where: { id: "demo-group" },
    update: {},
    create: {
      id: "demo-group",
      tenantId: tenant.id,
      name: "Английский язык — группа A1",
      monthlyPrice: 1200,
      teacherId: teacher.id,
    },
  });

  await prisma.student.upsert({
    where: { id: "demo-student" },
    update: {},
    create: {
      id: "demo-student",
      tenantId: tenant.id,
      groupId: group.id,
      fullName: "Петров Пётр",
      status: StudentStatus.ACTIVE,
    },
  });

  console.log("Seed завершён:");
  console.log("  Супер-Админ: admin@demo.local / admin123");
  console.log("  Преподаватель: teacher@demo.local / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
