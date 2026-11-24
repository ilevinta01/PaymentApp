import { ForbiddenException, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, PaymentMethod, Role } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramBotService, ConsentStatus } from "../telegram/telegram-bot.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { DepositBalanceDto } from "./dto/deposit-balance.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpdateStudentStatusDto } from "./dto/update-student-status.dto";

const WITH_GROUP = {
  group: { select: { id: true, name: true, monthlyPrice: true } },
} as const;

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Наличные",
  [PaymentMethod.CARD]: "Карта",
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  // Преподаватель видит только учеников своих групп, Супер-Админ — всех учеников тенанта.
  async findAllForUser(
    tenantId: string,
    user: JwtPayload,
    options: { search?: string; groupId?: string } = {},
  ) {
    const students = await this.prisma.student.findMany({
      where: {
        tenantId,
        anonymizedAt: null,
        ...(user.role === Role.TEACHER ? { group: { teachers: { some: { id: user.sub } } } } : {}),
        ...(options.groupId ? { groupId: options.groupId } : {}),
        ...(options.search ? { fullName: { contains: options.search, mode: "insensitive" } } : {}),
      },
      include: WITH_GROUP,
      orderBy: { fullName: "asc" },
    });

    return this.withPaidStatus(tenantId, students);
  }

  async findOne(tenantId: string, id: string, user: JwtPayload) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        tenantId,
        ...(user.role === Role.TEACHER ? { group: { teachers: { some: { id: user.sub } } } } : {}),
      },
      include: WITH_GROUP,
    });
    if (!student) throw new NotFoundException("Ученик не найден");

    const [withStatus] = await this.withPaidStatus(tenantId, [student]);
    return withStatus;
  }

  create(tenantId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        groupId: dto.groupId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        phone: dto.phone ?? null,
        parentFullName: dto.parentFullName ?? null,
        parentPhone: dto.parentPhone ?? null,
        parentTelegramChatId: dto.parentTelegramChatId ?? null,
      },
      include: WITH_GROUP,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findFirst({ where: { id, tenantId } });
    if (!student) throw new NotFoundException("Ученик не найден");

    if (dto.groupId !== undefined) {
      const targetGroup = await this.prisma.group.findFirst({ where: { id: dto.groupId, tenantId } });
      if (!targetGroup) throw new NotFoundException("Группа не найдена");
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
        ...(dto.dateOfBirth !== undefined
          ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.parentFullName !== undefined ? { parentFullName: dto.parentFullName } : {}),
        ...(dto.parentPhone !== undefined ? { parentPhone: dto.parentPhone } : {}),
        ...(dto.parentTelegramChatId !== undefined ? { parentTelegramChatId: dto.parentTelegramChatId } : {}),
      },
      include: WITH_GROUP,
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateStudentStatusDto) {
    const student = await this.prisma.student.findFirst({ where: { id, tenantId } });
    if (!student) throw new NotFoundException("Ученик не найден");

    return this.prisma.student.update({
      where: { id },
      data: {
        status: dto.status,
        statusUntil: dto.statusUntil ? new Date(dto.statusUntil) : null,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { payments: true, individualLessonShares: true } } },
    });
    if (!student) throw new NotFoundException("Ученик не найден");
    if (student._count.payments > 0 || student._count.individualLessonShares > 0) {
      throw new BadRequestException(
        "У ученика есть история оплат — удалить его нельзя, чтобы не потерять финансовые записи. Нажмите «Анонимизировать ученика»: личные данные будут стёрты, а платежи останутся в отчётах без привязки к человеку.",
      );
    }
    await this.prisma.student.delete({ where: { id } });
    return { success: true };
  }

  // Право на удаление данных: стираем всё, что указывает на человека (ФИО, даты, телефоны,
  // родителя, статус здоровья, Telegram), а платежи и занятия оставляем для финансовой истории.
  // Действие необратимо. actorId пуст, если обезличивание сделано автоматически по сроку хранения.
  async anonymize(tenantId: string, studentId: string, actorId: string | null, reason: "MANUAL" | "RETENTION") {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException("Ученик не найден");
    if (student.anonymizedAt) throw new BadRequestException("Данные этого ученика уже обезличены");

    const label = `Ученик №${student.id.slice(0, 4).toUpperCase()} (обезличен)`;
    const oldName = student.fullName;
    const chatId = student.parentTelegramChatId;

    // В журнале индивидуальных занятий имена учеников сохранены текстом — заменяем и там.
    const logs = await this.prisma.individualLessonLog.findMany({
      where: { tenantId, studentNames: { contains: oldName } },
      select: { id: true, studentNames: true },
    });

    await this.prisma.$transaction([
      this.prisma.student.update({
        where: { id: studentId },
        data: {
          fullName: label,
          dateOfBirth: null,
          phone: null,
          parentFullName: null,
          parentPhone: null,
          parentTelegramChatId: null,
          status: "ACTIVE",
          statusUntil: null,
          anonymizedAt: new Date(),
        },
      }),
      ...logs.map((log) =>
        this.prisma.individualLessonLog.update({
          where: { id: log.id },
          data: {
            studentNames: log.studentNames
              .split(", ")
              .map((name) => (name === oldName ? label : name))
              .join(", "),
          },
        }),
      ),
      this.prisma.dataErasureLog.create({
        data: { tenantId, studentId, studentLabel: label, reason, actorId },
      }),
    ]);

    // Чат родителя (его имя и @username в Telegram) стираем, если им не пользуется другой ребёнок.
    if (chatId) {
      const stillUsed = await this.prisma.student.count({
        where: { tenantId, parentTelegramChatId: chatId, anonymizedAt: null },
      });
      if (stillUsed === 0) await this.prisma.telegramChat.deleteMany({ where: { tenantId, chatId } });
    }

    return { success: true };
  }

  // Пополняет баланс (аванс) ученика. Деньги просто ложатся на баланс и лежат там —
  // никакого автоматического списания в счёт будущих месяцев. Списание — отдельное явное
  // действие (оплата за месяц/индивидуальное занятие с выбором способа "с баланса").
  async depositBalance(tenantId: string, user: JwtPayload, studentId: string, dto: DepositBalanceDto) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException("Ученик не найден");

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });

    if (dto.paymentMethod === "CARD" && !settings?.isCardEnabled) {
      throw new ForbiddenException("Оплата картой не включена в настройках детского центра");
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.balanceTransaction.create({
        data: {
          tenantId,
          studentId,
          amount: dto.amount,
          kind: "DEPOSIT",
          paymentMethod: dto.paymentMethod,
          note: dto.note,
          createdById: user.sub,
        },
      }),
      this.prisma.student.update({
        where: { id: studentId },
        data: { balance: { increment: dto.amount } },
        include: WITH_GROUP,
      }),
    ]);

    if (settings?.isTelegramEnabled && settings.telegramBotToken && student.parentTelegramChatId) {
      const collector = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { fullName: true } });
      const text = [
        "Пополнение баланса (аванс)",
        `Ученик: ${student.fullName}`,
        `Сумма: ${dto.amount}`,
        `Способ: ${METHOD_LABEL[dto.paymentMethod]}`,
        `Новый баланс: ${updated.balance}`,
        `Принял(а): ${collector?.fullName ?? "—"}`,
      ].join("\n");
      await this.telegramBot.sendToParent(tenantId, settings.telegramBotToken, student.parentTelegramChatId, text);
    }

    return (await this.withPaidStatus(tenantId, [updated]))[0];
  }

  async getBalanceTransactions(tenantId: string, studentId: string) {
    return this.prisma.balanceTransaction.findMany({
      where: { tenantId, studentId },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // Помечает каждого ученика признаком оплаты за текущий расчётный месяц и состоянием
  // согласия родителя на обработку данных (null — Telegram родителя не привязан).
  private async withPaidStatus<T extends { id: string; parentTelegramChatId: string | null }>(
    tenantId: string,
    students: T[],
  ) {
    type Result = T & { isPaidCurrentMonth: boolean; parentConsentStatus: ConsentStatus | null };
    if (students.length === 0) return [] as Result[];

    const periodMonth = getCurrentPeriodMonth();
    const [payments, consent] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, periodMonth, studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true },
      }),
      this.telegramBot.getConsentStatuses(
        tenantId,
        students.map((s) => s.parentTelegramChatId).filter((id): id is string => !!id),
      ),
    ]);
    const paidIds = new Set(payments.map((p) => p.studentId));

    return students.map(
      (student): Result => ({
        ...student,
        isPaidCurrentMonth: paidIds.has(student.id),
        parentConsentStatus: student.parentTelegramChatId
          ? (consent.get(student.parentTelegramChatId) ?? "PENDING")
          : null,
      }),
    );
  }
}
