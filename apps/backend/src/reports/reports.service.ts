import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { PaymentMethod } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { DebtorsService } from "../debtors/debtors.service";
import { PrismaService } from "../prisma/prisma.service";

const METHOD_LABEL: Record<string, string> = { CASH: "Наличные", CARD: "Карта" };

function periodMonthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split("-").map(Number);
  return { start: new Date(year, mon - 1, 1), end: new Date(year, mon, 1) };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debtorsService: DebtorsService,
  ) {}

  async getSummary(tenantId: string, periodMonth?: string) {
    const month = periodMonth ?? getCurrentPeriodMonth();
    const { start, end } = periodMonthRange(month);

    // fundedFromBalance:false — списания с баланса ученика не новая выручка (деньги уже
    // учтены в момент пополнения, см. DEPOSIT ниже), иначе доход задвоился бы.
    const [payments, deposits, studentsCount, debtors] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, periodMonth: month, fundedFromBalance: false },
        select: { amount: true, paymentMethod: true },
      }),
      this.prisma.balanceTransaction.findMany({
        where: { tenantId, kind: "DEPOSIT", createdAt: { gte: start, lt: end } },
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
    for (const deposit of deposits) {
      const amount = Number(deposit.amount);
      if (deposit.paymentMethod === PaymentMethod.CASH) cashTotal += amount;
      else cardTotal += amount;
    }

    return {
      periodMonth: month,
      totalCollected: (cashTotal + cardTotal).toFixed(2),
      cashTotal: cashTotal.toFixed(2),
      cardTotal: cardTotal.toFixed(2),
      paymentsCount: payments.length + deposits.length,
      studentsCount,
      debtorsCount: debtors.length,
    };
  }

  async getPaymentsByGroup(tenantId: string, periodMonth?: string) {
    const month = periodMonth ?? getCurrentPeriodMonth();
    const { start, end } = periodMonthRange(month);

    const [payments, deposits] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, periodMonth: month, fundedFromBalance: false },
        include: { student: { include: { group: { select: { id: true, name: true } } } } },
        orderBy: { dateTime: "desc" },
      }),
      this.prisma.balanceTransaction.findMany({
        where: { tenantId, kind: "DEPOSIT", createdAt: { gte: start, lt: end } },
        include: { student: { include: { group: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const byGroup = new Map<
      string,
      {
        groupId: string;
        groupName: string;
        cashTotal: number;
        cardTotal: number;
        depositsTotal: number;
        payments: { id: string; studentName: string; amount: string; paymentMethod: string; dateTime: Date }[];
        deposits: { id: string; studentName: string; amount: string; paymentMethod: string; dateTime: Date }[];
      }
    >();

    const ensure = (groupId: string, groupName: string) => {
      if (!byGroup.has(groupId)) {
        byGroup.set(groupId, {
          groupId,
          groupName,
          cashTotal: 0,
          cardTotal: 0,
          depositsTotal: 0,
          payments: [],
          deposits: [],
        });
      }
      return byGroup.get(groupId)!;
    };

    for (const payment of payments) {
      const group = payment.student.group;
      const entry = ensure(group.id, group.name);
      const amount = Number(payment.amount);
      if (payment.paymentMethod === PaymentMethod.CASH) entry.cashTotal += amount;
      else entry.cardTotal += amount;
      entry.payments.push({
        id: payment.id,
        studentName: payment.student.fullName,
        amount: payment.amount.toString(),
        paymentMethod: payment.paymentMethod,
        dateTime: payment.dateTime,
      });
    }

    for (const deposit of deposits) {
      const group = deposit.student.group;
      const entry = ensure(group.id, group.name);
      entry.depositsTotal += Number(deposit.amount);
      entry.deposits.push({
        id: deposit.id,
        studentName: deposit.student.fullName,
        amount: deposit.amount.toString(),
        paymentMethod: deposit.paymentMethod ?? "CASH",
        dateTime: deposit.createdAt,
      });
    }

    return Array.from(byGroup.values())
      .map((e) => ({
        groupId: e.groupId,
        groupName: e.groupName,
        totalCollected: (e.cashTotal + e.cardTotal).toFixed(2),
        cashTotal: e.cashTotal.toFixed(2),
        cardTotal: e.cardTotal.toFixed(2),
        paymentsCount: e.payments.length,
        payments: e.payments,
        depositsTotal: e.depositsTotal.toFixed(2),
        deposits: e.deposits,
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }

  async exportPaymentsByGroupExcel(tenantId: string, periodMonth?: string, groupId?: string): Promise<Buffer> {
    const month = periodMonth ?? getCurrentPeriodMonth();
    const groups = await this.getPaymentsByGroup(tenantId, month);
    const filtered = groupId ? groups.filter((g) => g.groupId === groupId) : groups;

    const workbook = new ExcelJS.Workbook();
    const usedNames = new Set<string>();

    for (const group of filtered.length > 0 ? filtered : [null]) {
      let sheetName = group ? group.groupName.slice(0, 28) : "Отчёт";
      let suffix = 2;
      while (usedNames.has(sheetName)) {
        sheetName = `${(group?.groupName ?? "Отчёт").slice(0, 25)} (${suffix++})`;
      }
      usedNames.add(sheetName);

      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = [
        { header: "Ученик", key: "studentName", width: 28 },
        { header: "Сумма", key: "amount", width: 14 },
        { header: "Способ", key: "paymentMethod", width: 12 },
        { header: "Дата", key: "dateTime", width: 20 },
      ];
      sheet.getRow(1).font = { bold: true };

      if (group) {
        for (const p of group.payments) {
          sheet.addRow({
            studentName: p.studentName,
            amount: p.amount,
            paymentMethod: METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod,
            dateTime: new Date(p.dateTime).toLocaleString("ru-RU"),
          });
        }
        sheet.addRow({});
        const tuitionTotalRow = sheet.addRow({ studentName: "Итого за месяц", amount: group.totalCollected });
        tuitionTotalRow.font = { bold: true };

        if (group.deposits.length > 0) {
          sheet.addRow({});
          const header = sheet.addRow({ studentName: "Пополнения баланса (аванс)" });
          header.font = { bold: true };
          for (const d of group.deposits) {
            sheet.addRow({
              studentName: d.studentName,
              amount: d.amount,
              paymentMethod: METHOD_LABEL[d.paymentMethod] ?? d.paymentMethod,
              dateTime: new Date(d.dateTime).toLocaleString("ru-RU"),
            });
          }
          const depositsTotalRow = sheet.addRow({ studentName: "Итого пополнений", amount: group.depositsTotal });
          depositsTotalRow.font = { bold: true };
        }
      }
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getIndividualDebtors(tenantId: string) {
    const participants = await this.prisma.individualLessonParticipant.findMany({
      where: { isPaid: false, individualLesson: { tenantId } },
      include: {
        student: { select: { id: true, fullName: true } },
        individualLesson: { include: { teacher: { select: { id: true, fullName: true } } } },
      },
      orderBy: { individualLesson: { startAt: "asc" } },
    });

    const byTeacher = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        totalOwed: number;
        debtors: {
          participantId: string;
          studentId: string;
          studentName: string;
          shareAmount: string;
          lessonStartAt: Date;
          subject: string | null;
        }[];
      }
    >();

    for (const p of participants) {
      const teacher = p.individualLesson.teacher;
      if (!byTeacher.has(teacher.id)) {
        byTeacher.set(teacher.id, { teacherId: teacher.id, teacherName: teacher.fullName, totalOwed: 0, debtors: [] });
      }
      const entry = byTeacher.get(teacher.id)!;
      entry.totalOwed += Number(p.shareAmount);
      entry.debtors.push({
        participantId: p.id,
        studentId: p.studentId,
        studentName: p.student.fullName,
        shareAmount: p.shareAmount.toString(),
        lessonStartAt: p.individualLesson.startAt,
        subject: p.individualLesson.subject,
      });
    }

    return Array.from(byTeacher.values())
      .map((e) => ({ ...e, totalOwed: e.totalOwed.toFixed(2) }))
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }

  async getChangeLog(tenantId: string, category?: string, actorId?: string) {
    const [paymentLogs, lessonLogs] = await Promise.all([
      this.prisma.paymentLog.findMany({
        where: { tenantId, ...(actorId ? { editedById: actorId } : {}) },
        include: { editedBy: { select: { id: true, fullName: true } }, payment: { include: { student: { select: { fullName: true } } } } },
        orderBy: { editDate: "desc" },
      }),
      this.prisma.individualLessonLog.findMany({
        where: { tenantId, ...(actorId ? { actorId } : {}) },
        include: { actor: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const entries = [
      ...paymentLogs.map((l) => ({
        id: l.id,
        category: "PAYMENT_EDITED" as const,
        date: l.editDate,
        actorId: l.editedBy.id,
        actorName: l.editedBy.fullName,
        studentName: l.payment.student.fullName,
        description: `Оплата изменена: ${l.oldAmount} (${METHOD_LABEL[l.oldMethod]}) → ${l.newAmount} (${METHOD_LABEL[l.newMethod]}). Причина: ${l.reason}`,
      })),
      ...lessonLogs.map((l) => ({
        id: l.id,
        category: l.action === "CANCELLED" ? ("INDIVIDUAL_CANCELLED" as const) : ("INDIVIDUAL_PAID" as const),
        date: l.createdAt,
        actorId: l.actor.id,
        actorName: l.actor.fullName,
        studentName: l.studentNames,
        description:
          l.action === "CANCELLED"
            ? `Отменено индивидуальное занятие (${l.teacherName}, ${new Date(l.lessonStartAt).toLocaleString("ru-RU")})`
            : `Оплата индивидуального занятия: ${l.amount ?? ""}${l.details ? ` — ${l.details}` : ""}`,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return category ? entries.filter((e) => e.category === category) : entries;
  }

  async getTeacherEarnings(tenantId: string, periodMonth?: string) {
    const month = periodMonth ?? getCurrentPeriodMonth();
    const { start: monthStart, end: monthEnd } = periodMonthRange(month);

    const [payments, individualParticipants, deposits] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, periodMonth: month, fundedFromBalance: false },
        include: {
          student: { include: { group: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { dateTime: "desc" },
      }),
      this.prisma.individualLessonParticipant.findMany({
        where: {
          isPaid: true,
          paidFromBalance: false,
          paidAt: { gte: monthStart, lt: monthEnd },
          individualLesson: { tenantId },
        },
        include: {
          student: { select: { fullName: true } },
          paidBy: { select: { id: true, fullName: true } },
          individualLesson: { include: { teacher: { select: { id: true, fullName: true } } } },
        },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.balanceTransaction.findMany({
        where: { tenantId, kind: "DEPOSIT", createdAt: { gte: monthStart, lt: monthEnd } },
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
    ]);

    const byTeacher = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        groupTotal: number;
        individualTotal: number;
        depositsTotal: number;
        groupsMap: Map<string, { groupId: string; groupName: string; amount: number }>;
        payments: {
          id: string;
          studentName: string;
          groupName: string;
          amount: string;
          paymentMethod: string;
          dateTime: Date;
        }[];
        individualPayments: {
          studentName: string;
          amount: string;
          paymentMethod: string | null;
          dateTime: Date | null;
          subject: string | null;
        }[];
      }
    >();

    const ensure = (id: string, name: string) => {
      if (!byTeacher.has(id)) {
        byTeacher.set(id, {
          teacherId: id,
          teacherName: name,
          groupTotal: 0,
          individualTotal: 0,
          depositsTotal: 0,
          groupsMap: new Map(),
          payments: [],
          individualPayments: [],
        });
      }
      return byTeacher.get(id)!;
    };

    for (const payment of payments) {
      const entry = ensure(payment.createdBy.id, payment.createdBy.fullName);
      const amount = Number(payment.amount);
      entry.groupTotal += amount;
      const group = payment.student.group;
      const gEntry = entry.groupsMap.get(group.id) ?? { groupId: group.id, groupName: group.name, amount: 0 };
      gEntry.amount += amount;
      entry.groupsMap.set(group.id, gEntry);
      entry.payments.push({
        id: payment.id,
        studentName: payment.student.fullName,
        groupName: group.name,
        amount: payment.amount.toString(),
        paymentMethod: payment.paymentMethod,
        dateTime: payment.dateTime,
      });
    }

    for (const p of individualParticipants) {
      // Деньги приписываем тому, кто ФАКТИЧЕСКИ провёл оплату (мог быть админ через общий
      // экран "Оплата"), а не тому, кто ведёт занятие — это разные люди. paidBy отсутствует
      // только у записей, оплаченных до появления этого поля — для них используем учителя
      // занятия как единственный доступный ориентир.
      const collector = p.paidBy ?? p.individualLesson.teacher;
      const entry = ensure(collector.id, collector.fullName);
      entry.individualTotal += Number(p.shareAmount);
      entry.individualPayments.push({
        studentName: p.student.fullName,
        amount: p.shareAmount.toString(),
        paymentMethod: p.paymentMethod,
        dateTime: p.paidAt,
        subject: p.individualLesson.subject,
      });
    }

    for (const deposit of deposits) {
      const entry = ensure(deposit.createdBy.id, deposit.createdBy.fullName);
      entry.depositsTotal += Number(deposit.amount);
    }

    return Array.from(byTeacher.values())
      .map((e) => ({
        teacherId: e.teacherId,
        teacherName: e.teacherName,
        totalAmount: (e.groupTotal + e.individualTotal + e.depositsTotal).toFixed(2),
        groupTotal: e.groupTotal.toFixed(2),
        individualTotal: e.individualTotal.toFixed(2),
        depositsTotal: e.depositsTotal.toFixed(2),
        groups: Array.from(e.groupsMap.values())
          .sort((a, b) => b.amount - a.amount)
          .map((g) => ({ ...g, amount: g.amount.toFixed(2) })),
        payments: e.payments,
        individualPayments: e.individualPayments,
      }))
      .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
  }
}
