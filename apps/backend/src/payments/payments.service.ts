import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, PaymentMethod, Role } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService } from "../telegram/telegram.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";

const WITH_STUDENT = {
  student: { select: { id: true, fullName: true } },
} as const;

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Наличные",
  [PaymentMethod.CARD]: "Карта",
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  findAll(tenantId: string, periodMonth?: string) {
    return this.prisma.payment.findMany({
      where: { tenantId, periodMonth: periodMonth ?? getCurrentPeriodMonth() },
      include: WITH_STUDENT,
      orderBy: { dateTime: "desc" },
    });
  }

  async create(tenantId: string, user: JwtPayload, dto: CreatePaymentDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId },
      include: { group: { include: { teachers: { select: { id: true } } } } },
    });
    if (!student) throw new NotFoundException("Ученик не найден");

    if (user.role === Role.TEACHER && !student.group.teachers.some((t) => t.id === user.sub)) {
      throw new ForbiddenException("У вас нет доступа к группе этого ученика");
    }

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });

    if (dto.paymentMethod === PaymentMethod.CARD && !settings?.isCardEnabled) {
      throw new ForbiddenException("Оплата картой не включена в настройках детского центра");
    }

    let amount: number;
    if (user.role === Role.TEACHER) {
      amount = Number(student.group.monthlyPrice);
    } else {
      if (dto.amount === undefined) {
        throw new BadRequestException("Для Супер-Админа поле суммы обязательно");
      }
      amount = dto.amount;
    }

    const periodMonth = user.role === Role.SUPER_ADMIN && dto.periodMonth ? dto.periodMonth : getCurrentPeriodMonth();

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        studentId: student.id,
        amount,
        paymentMethod: dto.paymentMethod,
        createdById: user.sub,
        periodMonth,
      },
      include: WITH_STUDENT,
    });

    if (settings?.isTelegramEnabled && settings?.telegramBotToken && student.parentTelegramChatId) {
      const text = [
        "Оплата получена",
        `Ученик: ${student.fullName}`,
        `Сумма: ${amount}`,
        `Способ: ${METHOD_LABEL[dto.paymentMethod]}`,
        `Месяц: ${periodMonth}`,
      ].join("\n");
      await this.telegram.sendMessage(settings.telegramBotToken, student.parentTelegramChatId, text);
    }

    return payment;
  }

  async update(tenantId: string, editedById: string, paymentId: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException("Платёж не найден");

    const newAmount = dto.amount ?? Number(payment.amount);
    const newMethod = dto.paymentMethod ?? payment.paymentMethod;

    if (newAmount === Number(payment.amount) && newMethod === payment.paymentMethod) {
      throw new BadRequestException("Нет изменений для сохранения");
    }

    if (newMethod === PaymentMethod.CARD) {
      const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
      if (!settings?.isCardEnabled) {
        throw new ForbiddenException("Оплата картой не включена в настройках детского центра");
      }
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { amount: newAmount, paymentMethod: newMethod },
        include: WITH_STUDENT,
      }),
      this.prisma.paymentLog.create({
        data: {
          tenantId,
          paymentId,
          oldAmount: payment.amount,
          newAmount,
          oldMethod: payment.paymentMethod,
          newMethod,
          reason: dto.reason,
          editedById,
        },
      }),
    ]);

    return updated;
  }
}
