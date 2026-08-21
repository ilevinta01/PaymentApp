import { Injectable } from "@nestjs/common";
import { StudentStatus } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DebtorsService {
  constructor(private readonly prisma: PrismaService) {}

  // Считаем должников "на лету" по текущим данным (а не по кэшированному флагу),
  // чтобы список на экране Администратора всегда отражал актуальную картину,
  // даже если оплата/статус изменились между запусками Cron (ТЗ п.2.2).
  async getDebtors(tenantId: string) {
    const periodMonth = getCurrentPeriodMonth();
    const today = new Date();

    const [students, paidPayments] = await Promise.all([
      this.prisma.student.findMany({
        where: { tenantId },
        include: { group: { select: { id: true, name: true, monthlyPrice: true } } },
        orderBy: { fullName: "asc" },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, periodMonth },
        select: { studentId: true },
      }),
    ]);

    const paidStudentIds = new Set(paidPayments.map((p) => p.studentId));

    return students.filter((student) => {
      if (paidStudentIds.has(student.id)) return false;

      const isOnHold =
        student.status !== StudentStatus.ACTIVE && (!student.statusUntil || student.statusUntil >= today);
      return !isOnHold;
    });
  }
}
