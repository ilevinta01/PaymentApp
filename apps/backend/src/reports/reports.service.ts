import { Injectable } from "@nestjs/common";
import { PaymentMethod } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { DebtorsService } from "../debtors/debtors.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debtorsService: DebtorsService,
  ) {}

  async getSummary(tenantId: string, periodMonth?: string) {
    const month = periodMonth ?? getCurrentPeriodMonth();

    const [payments, studentsCount, debtors] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, periodMonth: month },
        select: { amount: true, paymentMethod: true },
      }),
      this.prisma.student.count({ where: { tenantId } }),
      // Понятие "должник" применимо только к текущему месяцу — при просмотре
      // сводки за прошлые месяцы это число всегда отражает текущих должников.
      this.debtorsService.getDebtors(tenantId),
    ]);

    let cashTotal = 0;
    let cardTotal = 0;
    for (const payment of payments) {
      const amount = Number(payment.amount);
      if (payment.paymentMethod === PaymentMethod.CASH) cashTotal += amount;
      else cardTotal += amount;
    }

    return {
      periodMonth: month,
      totalCollected: (cashTotal + cardTotal).toFixed(2),
      cashTotal: cashTotal.toFixed(2),
      cardTotal: cardTotal.toFixed(2),
      paymentsCount: payments.length,
      studentsCount,
      debtorsCount: debtors.length,
    };
  }

  async getTeacherEarnings(tenantId: string, periodMonth?: string) {
    const month = periodMonth ?? getCurrentPeriodMonth();

    const payments = await this.prisma.payment.findMany({
      where: { tenantId, periodMonth: month },
      include: {
        student: { select: { fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { dateTime: "desc" },
    });

    const byTeacher = new Map<
      string,
      { teacherId: string; teacherName: string; totalAmount: number; payments: unknown[] }
    >();

    for (const payment of payments) {
      const key = payment.createdBy.id;
      if (!byTeacher.has(key)) {
        byTeacher.set(key, { teacherId: key, teacherName: payment.createdBy.fullName, totalAmount: 0, payments: [] });
      }
      const entry = byTeacher.get(key)!;
      entry.totalAmount += Number(payment.amount);
      entry.payments.push({
        id: payment.id,
        studentName: payment.student.fullName,
        amount: payment.amount.toString(),
        paymentMethod: payment.paymentMethod,
        dateTime: payment.dateTime,
      });
    }

    return Array.from(byTeacher.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((entry) => ({ ...entry, totalAmount: entry.totalAmount.toFixed(2) }));
  }
}
