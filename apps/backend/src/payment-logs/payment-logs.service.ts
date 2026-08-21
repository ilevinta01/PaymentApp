import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const logs = await this.prisma.paymentLog.findMany({
      where: { tenantId },
      include: {
        payment: { include: { student: { select: { id: true, fullName: true } } } },
        editedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { editDate: "desc" },
    });

    return logs.map((log) => ({
      id: log.id,
      paymentId: log.paymentId,
      editDate: log.editDate,
      oldAmount: log.oldAmount,
      newAmount: log.newAmount,
      oldMethod: log.oldMethod,
      newMethod: log.newMethod,
      reason: log.reason,
      editedBy: log.editedBy,
      student: log.payment.student,
    }));
  }
}
