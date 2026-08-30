import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtPayload, PaymentMethod, Role } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService } from "../telegram/telegram.service";
import { CreateIndividualLessonDto } from "./dto/create-individual-lesson.dto";
import { MarkParticipantPaidDto } from "./dto/mark-participant-paid.dto";
import { UpdateIndividualLessonDto } from "./dto/update-individual-lesson.dto";

export const WITH_DETAILS = {
  teacher: { select: { id: true, fullName: true } },
  room: { select: { id: true, name: true } },
  participants: { include: { student: { select: { id: true, fullName: true } } } },
} as const;

function splitEvenly(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;
  return Array.from({ length: count }, (_, i) => (baseCents + (i < remainder ? 1 : 0)) / 100);
}

// Prisma include-запросы возвращают вложенные объекты (teacher.fullName, participant.student.fullName),
// а фронтенд ждёт плоские поля teacherName/studentName — приводим форму здесь, в одном месте.
export function mapLesson(lesson: {
  id: string;
  teacherId: string;
  teacher: { fullName: string };
  startAt: Date;
  durationMinutes: number;
  hourlyRateSnapshot: unknown;
  totalPrice: unknown;
  createdAt: Date;
  roomId: string | null;
  room: { id: string; name: string } | null;
  subject: string | null;
  participants: {
    id: string;
    studentId: string;
    student: { fullName: string };
    shareAmount: unknown;
    isPaid: boolean;
    paymentMethod: string | null;
    paidAt: Date | null;
  }[];
}) {
  return {
    id: lesson.id,
    teacherId: lesson.teacherId,
    teacherName: lesson.teacher.fullName,
    startAt: lesson.startAt,
    durationMinutes: lesson.durationMinutes,
    hourlyRateSnapshot: lesson.hourlyRateSnapshot,
    totalPrice: lesson.totalPrice,
    createdAt: lesson.createdAt,
    roomId: lesson.roomId,
    roomName: lesson.room?.name ?? null,
    subject: lesson.subject,
    participants: lesson.participants.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      studentName: p.student.fullName,
      shareAmount: p.shareAmount,
      isPaid: p.isPaid,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
    })),
  };
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

  async findAll(tenantId: string, user: JwtPayload) {
    const lessons = await this.prisma.individualLesson.findMany({
      where: { tenantId, ...(user.role === Role.TEACHER ? { teacherId: user.sub } : {}) },
      include: WITH_DETAILS,
      orderBy: { startAt: "desc" },
    });
    return lessons.map(mapLesson);
  }

  async findForStudent(tenantId: string, studentId: string) {
    const rows = await this.prisma.individualLessonParticipant.findMany({
      where: { studentId, individualLesson: { tenantId } },
      include: {
        student: { select: { fullName: true } },
        individualLesson: {
          include: { teacher: { select: { id: true, fullName: true } }, room: { select: { id: true, name: true } } },
        },
      },
      orderBy: { individualLesson: { startAt: "desc" } },
    });
    return rows.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      studentName: p.student.fullName,
      shareAmount: p.shareAmount,
      isPaid: p.isPaid,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
      individualLesson: {
        id: p.individualLesson.id,
        teacherId: p.individualLesson.teacherId,
        teacherName: p.individualLesson.teacher.fullName,
        startAt: p.individualLesson.startAt,
        durationMinutes: p.individualLesson.durationMinutes,
        hourlyRateSnapshot: p.individualLesson.hourlyRateSnapshot,
        totalPrice: p.individualLesson.totalPrice,
        createdAt: p.individualLesson.createdAt,
        roomId: p.individualLesson.roomId,
        roomName: p.individualLesson.room?.name ?? null,
        subject: p.individualLesson.subject,
      },
    }));
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

    const roomId = dto.roomId || undefined;
    if (roomId) {
      const room = await this.prisma.room.findFirst({ where: { id: roomId, tenantId } });
      if (!room) throw new NotFoundException("Зал не найден");
    }

    const studentConflicts = await this.findStudentGroupConflicts(
      tenantId,
      uniqueStudentIds,
      new Date(dto.startAt),
      dto.durationMinutes,
    );
    if (studentConflicts.length > 0 && !dto.confirmStudentConflict) {
      throw new ConflictException({
        statusCode: 409,
        requiresConfirmation: true,
        message: `Пересечение с расписанием группы у ${studentConflicts.map((c) => `«${c.studentName}» (группа «${c.groupName}»)`).join(", ")}. Всё равно создать занятие?`,
      });
    }

    const warnings = await this.assertNoConflict(tenantId, teacherId, new Date(dto.startAt), dto.durationMinutes, roomId);
    warnings.push(
      ...studentConflicts.map(
        (c) => `У «${c.studentName}» это время пересекается с расписанием группы «${c.groupName}» — родитель уведомлён`,
      ),
    );

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
        roomId,
        subject: dto.subject || null,
        participants: {
          create: uniqueStudentIds.map((studentId, i) => ({ studentId, shareAmount: shares[i] })),
        },
      },
      include: WITH_DETAILS,
    });

    await this.sendNotifications(tenantId, lesson, "created", studentConflicts);

    return { ...mapLesson(lesson), warnings };
  }

  async update(tenantId: string, user: JwtPayload, lessonId: string, dto: UpdateIndividualLessonDto) {
    const lesson = await this.prisma.individualLesson.findFirst({ where: { id: lessonId, tenantId }, include: WITH_DETAILS });
    if (!lesson) throw new NotFoundException("Занятие не найдено");

    if (user.role === Role.TEACHER && lesson.teacherId !== user.sub) {
      throw new ForbiddenException("Это занятие ведёт другой преподаватель");
    }

    const newStartAt = dto.startAt ? new Date(dto.startAt) : lesson.startAt;
    const newDuration = dto.durationMinutes ?? lesson.durationMinutes;
    const newRoomId = dto.roomId !== undefined ? dto.roomId || null : lesson.roomId;

    if (newRoomId) {
      const room = await this.prisma.room.findFirst({ where: { id: newRoomId, tenantId } });
      if (!room) throw new NotFoundException("Зал не найден");
    }

    let warnings: string[] = [];
    let studentConflicts: { studentId: string; studentName: string; groupName: string }[] = [];
    if (dto.startAt !== undefined || dto.durationMinutes !== undefined) {
      studentConflicts = await this.findStudentGroupConflicts(
        tenantId,
        lesson.participants.map((p) => p.studentId),
        newStartAt,
        newDuration,
      );
      if (studentConflicts.length > 0 && !dto.confirmStudentConflict) {
        throw new ConflictException({
          statusCode: 409,
          requiresConfirmation: true,
          message: `Пересечение с расписанием группы у ${studentConflicts.map((c) => `«${c.studentName}» (группа «${c.groupName}»)`).join(", ")}. Всё равно изменить занятие?`,
        });
      }
    }
    if (dto.startAt !== undefined || dto.durationMinutes !== undefined || dto.roomId !== undefined) {
      warnings = await this.assertNoConflict(
        tenantId,
        lesson.teacherId,
        newStartAt,
        newDuration,
        newRoomId ?? undefined,
        lessonId,
      );
      warnings.push(
        ...studentConflicts.map(
          (c) => `У «${c.studentName}» это время пересекается с расписанием группы «${c.groupName}» — родитель уведомлён`,
        ),
      );
    }

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
        data: {
          startAt: newStartAt,
          durationMinutes: newDuration,
          totalPrice: newTotalPrice,
          roomId: newRoomId,
          ...(dto.subject !== undefined ? { subject: dto.subject || null } : {}),
        },
      });
      for (const s of shareUpdates) {
        await tx.individualLessonParticipant.update({ where: { id: s.id }, data: { shareAmount: s.shareAmount } });
      }
      return tx.individualLesson.findUniqueOrThrow({ where: { id: lessonId }, include: WITH_DETAILS });
    });

    await this.sendNotifications(tenantId, updated, "updated", studentConflicts);

    return { ...mapLesson(updated), warnings };
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
      const collector = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { fullName: true } });
      const text = [
        "Оплата индивидуального занятия получена",
        `Ученик: ${participant.student.fullName}`,
        `Преподаватель: ${participant.individualLesson.teacher.fullName}`,
        `Дата занятия: ${formatDateTime(participant.individualLesson.startAt)}`,
        `Сумма: ${participant.shareAmount}`,
        `Способ: ${METHOD_LABEL[dto.paymentMethod]}`,
        `Оплату принял(а): ${collector?.fullName ?? "—"}`,
      ].join("\n");
      await this.telegram.sendMessage(settings.telegramBotToken, participant.student.parentTelegramChatId, text);
    }

    return updated;
  }

  // Запрещает пересечение нового/изменённого индивидуального занятия с расписанием групп
  // этого преподавателя и с его другими индивидуальными занятиями в тот же день (жёсткий блок).
  // Если указан зал (roomId), дополнительно проверяет занятость зала: по умолчанию это лишь
  // предупреждение (решение остаётся за пользователем), а если у зала allowDoubleBooking=false —
  // администратор явно запретил занимать зал одновременно, тогда это тоже жёсткий блок.
  private async assertNoConflict(
    tenantId: string,
    teacherId: string,
    startAt: Date,
    durationMinutes: number,
    roomId?: string,
    excludeLessonId?: string,
  ): Promise<string[]> {
    const dayOfWeek = startAt.getDay();
    const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
    const endMinutes = startMinutes + durationMinutes;

    const groupSlots = await this.prisma.groupScheduleSlot.findMany({
      where: { dayOfWeek, group: { tenantId, teachers: { some: { id: teacherId } } } },
      include: { group: { select: { name: true } } },
    });
    const groupConflict = groupSlots.find((s) => s.startMinutes < endMinutes && startMinutes < s.endMinutes);
    if (groupConflict) {
      throw new ConflictException(`Пересечение с расписанием группы «${groupConflict.group.name}»`);
    }

    const dayStart = new Date(startAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const newEnd = new Date(startAt.getTime() + durationMinutes * 60000);

    const otherLessons = await this.prisma.individualLesson.findMany({
      where: {
        tenantId,
        teacherId,
        startAt: { gte: dayStart, lt: dayEnd },
        ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      },
    });
    const lessonConflict = otherLessons.find((l) => {
      const existingEnd = new Date(l.startAt.getTime() + l.durationMinutes * 60000);
      return l.startAt < newEnd && startAt < existingEnd;
    });
    if (lessonConflict) {
      throw new ConflictException(
        `Пересечение с другим индивидуальным занятием (${formatDateTime(lessonConflict.startAt)})`,
      );
    }

    if (!roomId) return [];

    const room = await this.prisma.room.findFirst({ where: { id: roomId, tenantId } });
    if (!room) return [];

    const warnings: string[] = [];

    const roomGroupSlots = await this.prisma.groupScheduleSlot.findMany({
      where: { dayOfWeek, roomId, group: { tenantId } },
      include: { group: { select: { name: true } } },
    });
    const roomGroupConflict = roomGroupSlots.find((s) => s.startMinutes < endMinutes && startMinutes < s.endMinutes);
    if (roomGroupConflict) {
      const message = `Зал «${room.name}» в это время занят группой «${roomGroupConflict.group.name}»`;
      if (!room.allowDoubleBooking) throw new ConflictException(message);
      warnings.push(message);
    }

    const roomLessons = await this.prisma.individualLesson.findMany({
      where: {
        tenantId,
        roomId,
        startAt: { gte: dayStart, lt: dayEnd },
        ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      },
      include: { teacher: { select: { fullName: true } } },
    });
    const roomLessonConflict = roomLessons.find((l) => {
      const existingEnd = new Date(l.startAt.getTime() + l.durationMinutes * 60000);
      return l.startAt < newEnd && startAt < existingEnd;
    });
    if (roomLessonConflict) {
      const message = `Зал «${room.name}» в это время занят индивидуальным занятием (${roomLessonConflict.teacher.fullName})`;
      if (!room.allowDoubleBooking) throw new ConflictException(message);
      warnings.push(message);
    }

    return warnings;
  }

  // Проверяет, не пересекается ли новое/изменённое время индивидуального занятия с расписанием
  // СОБСТВЕННОЙ группы каждого ученика-участника. В отличие от конфликтов преподавателя это не
  // жёсткий блок: администратор явно подтверждает пересечение (dto.confirmStudentConflict), а
  // родителю дополнительно отправляется предупреждение в Telegram.
  private async findStudentGroupConflicts(
    tenantId: string,
    studentIds: string[],
    startAt: Date,
    durationMinutes: number,
  ): Promise<{ studentId: string; studentName: string; groupName: string }[]> {
    const dayOfWeek = startAt.getDay();
    const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
    const endMinutes = startMinutes + durationMinutes;

    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, tenantId },
      include: { group: { include: { scheduleSlots: { where: { dayOfWeek } } } } },
    });

    const conflicts: { studentId: string; studentName: string; groupName: string }[] = [];
    for (const student of students) {
      const slot = student.group.scheduleSlots.find((s) => s.startMinutes < endMinutes && startMinutes < s.endMinutes);
      if (slot) conflicts.push({ studentId: student.id, studentName: student.fullName, groupName: student.group.name });
    }
    return conflicts;
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
    studentConflicts: { studentId: string; groupName: string }[] = [],
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
      const conflict = studentConflicts.find((c) => c.studentId === student.id);
      const text = [
        parentHeader,
        `Ученик: ${student.fullName}`,
        `Преподаватель: ${lesson.teacher.fullName}`,
        `Дата и время: ${when}`,
        `Длительность: ${lesson.durationMinutes} мин`,
        `Ваша часть оплаты: ${participant.shareAmount}`,
        ...(conflict ? [`⚠ Внимание: это время пересекается с занятием группы «${conflict.groupName}»`] : []),
      ].join("\n");
      await this.telegram.sendMessage(settings.telegramBotToken, student.parentTelegramChatId, text);
    }
  }
}
