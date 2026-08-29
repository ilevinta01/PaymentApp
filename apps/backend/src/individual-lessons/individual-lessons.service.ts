import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, PaymentMethod, Role } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService } from "../telegram/telegram.service";
import { CreateIndividualLessonDto } from "./dto/create-individual-lesson.dto";
import { MarkParticipantPaidDto } from "./dto/mark-participant-paid.dto";
import { UpdateIndividualLessonDto } from "./dto/update-individual-lesson.dto";

const WITH_DETAILS = {
  teacher: { select: { id: true, fullName: true } },
  participants: { include: { student: { select: { id: true, fullName: true } } } },
} as const;

function splitEvenly(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;
  return Array.from({ length: count }, (_, i) => (baseCents + (i < remainder ? 1 : 0)) / 100);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Chisinau" });
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Наличные",
  [PaymentMethod.CARD]: "Карта",
};

@Injectable()
export class IndividualLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  findAll(tenantId: string, user: JwtPayload) {
    return this.prisma.individualLesson.findMany({
      where: { tenantId, ...(user.role === Role.TEACHER ? { teacherId: user.sub } : {}) },
      include: WITH_DETAILS,
      orderBy: { startAt: "desc" },
    });
  }

  findForStudent(tenantId: string, studentId: string) {
    return this.prisma.individualLessonParticipant.findMany({
      where: { studentId, individualLesson: { tenantId } },
      include: { individualLesson: { include: { teacher: { select: { id: true, fullName: true } } } } },
      orderBy: { individualLesson: { startAt: "desc" } },
    });
  }

  async create(tenantId: string, user: JwtPayload, dto: CreateIndividualLessonDto) {
    const teacherId = user.role === Role.TEACHER ? user.sub : dto.teacherId;
    if (!teacherId) throw new BadRequestException("Не указан преподаватель");

    const teacher = await this.prisma.user.findFirst({ where: { id: teacherId, tenantId, role: Role.TEACHER } });
    if (!teacher) throw new NotFoundException("Преподаватель не найден");
    if (!teacher.individualLessonRate) {
      throw new BadRequestException("У преподавателя не задана ставка за индивидуальное занятие");
    }

    const uniqueStudentIds = Array.from(new Set(dto.studentIds));
    const students = await this.prisma.student.findMany({ where: { id: { in: uniqueStudentIds }, tenantId } });
    if (students.length !== uniqueStudentIds.length) {
      throw new BadRequestException("Некоторые ученики не найдены");
    }

    const hourlyRate = Number(teacher.individualLessonRate);
    const totalPrice = Math.round(hourlyRate * (dto.durationMinutes / 60) * 100) / 100;
    const shares = splitEvenly(totalPrice, uniqueStudentIds.length);

    const lesson = await this.prisma.individualLesson.create({
      data: {
        tenantId,
        teacherId,
        startAt: new Date(dto.startAt),
        durationMinutes: dto.durationMinutes,
        hourlyRateSnapshot: hourlyRate,
        totalPrice,
        createdById: user.sub,
        participants: {
          create: uniqueStudentIds.map((studentId, i) => ({ studentId, shareAmount: shares[i] })),
        },
      },
      include: WITH_DETAILS,
    });

    await this.sendNotifications(tenantId, lesson, "created");

    return lesson;
  }

  async update(tenantId: string, user: JwtPayload, lessonId: string, dto: UpdateIndividualLessonDto) {
    const lesson = await this.prisma.individualLesson.findFirst({ where: { id: lessonId, tenantId }, include: WITH_DETAILS });
    if (!lesson) throw new NotFoundException("Занятие не найдено");

    if (user.role === Role.TEACHER && lesson.teacherId !== user.sub) {
      throw new ForbiddenException("Это занятие ведёт другой преподаватель");
    }

    const newStartAt = dto.startAt ? new Date(dto.startAt) : lesson.startAt;
    const newDuration = dto.durationMinutes ?? lesson.durationMinutes;

    let newTotalPrice = Number(lesson.totalPrice);
    const shareUpdates: { id: string; shareAmount: number }[] = [];

    if (dto.durationMinutes !== undefined && dto.durationMinutes !== lesson.durationMinutes) {
      newTotalPrice = Math.round(Number(lesson.hourlyRateSnapshot) * (newDuration / 60) * 100) / 100;

      const paid = lesson.participants.filter((p) => p.isPaid);
      const unpaid = lesson.participants.filter((p) => !p.isPaid);
      const paidTotal = paid.reduce((sum, p) => sum + Number(p.shareAmount), 0);
      const remaining = Math.max(0, Math.round((newTotalPrice - paidTotal) * 100) / 100);

      if (unpaid.length > 0) {
        const shares = splitEvenly(remaining, unpaid.length);
        unpaid.forEach((p, i) => shareUpdates.push({ id: p.id, shareAmount: shares[i] }));
      } else if (paidTotal !== newTotalPrice) {
        // Все уже оплатили — не меняем задним числом то, что уже собрано.
        newTotalPrice = paidTotal;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.individualLesson.update({
        where: { id: lessonId },
        data: { startAt: newStartAt, durationMinutes: newDuration, totalPrice: newTotalPrice },
      });
      for (const s of shareUpdates) {
        await tx.individualLessonParticipant.update({ where: { id: s.id }, data: { shareAmount: s.shareAmount } });
      }
      return tx.individualLesson.findUniqueOrThrow({ where: { id: lessonId }, include: WITH_DETAILS });
    });

    await this.sendNotifications(tenantId, updated, "updated");

    return updated;
  }

  async markParticipantPaid(tenantId: string, user: JwtPayload, participantId: string, dto: MarkParticipantPaidDto) {
    const participant = await this.prisma.individualLessonParticipant.findFirst({
      where: { id: participantId, individualLesson: { tenantId } },
      include: {
        student: true,
        individualLesson: { include: { teacher: { select: { fullName: true } } } },
      },
    });
    if (!participant) throw new NotFoundException("Участник занятия не найден");

    if (user.role === Role.TEACHER && participant.individualLesson.teacherId !== user.sub) {
      throw new ForbiddenException("Это занятие ведёт другой преподаватель");
    }

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });

    if (dto.paymentMethod === PaymentMethod.CARD && !settings?.isCardEnabled) {
      throw new ForbiddenException("Оплата картой не включена в настройках детского центра");
    }

    const updated = await this.prisma.individualLessonParticipant.update({
      where: { id: participantId },
      data: { isPaid: true, paymentMethod: dto.paymentMethod, paidAt: new Date() },
    });

    if (settings?.isTelegramEnabled && settings.telegramBotToken && participant.student.parentTelegramChatId) {
      const text = [
        "Оплата индивидуального занятия получена",
        `Ученик: ${participant.student.fullName}`,
        `Преподаватель: ${participant.individualLesson.teacher.fullName}`,
        `Сумма: ${participant.shareAmount}`,
        `Способ: ${METHOD_LABEL[dto.paymentMethod]}`,
      ].join("\n");
      await this.telegram.sendMessage(settings.telegramBotToken, participant.student.parentTelegramChatId, text);
    }

    return updated;
  }

  private async sendNotifications(
    tenantId: string,
    lesson: {
      startAt: Date;
      durationMinutes: number;
      totalPrice: unknown;
      teacher: { id: string; fullName: string };
      participants: { shareAmount: unknown; student: { id: string; fullName: string } }[];
    },
    kind: "created" | "updated",
  ) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (!settings?.isTelegramEnabled || !settings.telegramBotToken) return;

    const when = formatDateTime(lesson.startAt);
    const studentNames = lesson.participants.map((p) => p.student.fullName).join(", ");
    const teacherHeader = kind === "created" ? "Новое индивидуальное занятие" : "Изменено индивидуальное занятие";
    const parentHeader =
      kind === "created" ? "Назначено индивидуальное занятие" : "Изменено индивидуальное занятие";

    const teacherFull = await this.prisma.user.findUnique({ where: { id: lesson.teacher.id } });
    if (teacherFull?.telegramChatId) {
      const text = [
        teacherHeader,
        `Дата и время: ${when}`,
        `Длительность: ${lesson.durationMinutes} мин`,
        `Ученики: ${studentNames}`,
        `Сумма занятия: ${lesson.totalPrice}`,
      ].join("\n");
      await this.telegram.sendMessage(settings.telegramBotToken, teacherFull.telegramChatId, text);
    }

    const students = await this.prisma.student.findMany({
      where: { id: { in: lesson.participants.map((p) => p.student.id) } },
    });
    for (const participant of lesson.participants) {
      const student = students.find((s) => s.id === participant.student.id);
      if (!student?.parentTelegramChatId) continue;
      const text = [
        parentHeader,
        `Ученик: ${student.fullName}`,
        `Преподаватель: ${lesson.teacher.fullName}`,
        `Дата и время: ${when}`,
        `Длительность: ${lesson.durationMinutes} мин`,
        `Ваша часть оплаты: ${participant.shareAmount}`,
      ].join("\n");
      await this.telegram.sendMessage(settings.telegramBotToken, student.parentTelegramChatId, text);
    }
  }
}
