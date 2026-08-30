import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { minutesToTime } from "../groups/groups.service";
import { mapLesson, WITH_DETAILS } from "../individual-lessons/individual-lessons.service";
import { PrismaService } from "../prisma/prisma.service";

export type ScheduleView = "day" | "week" | "month";
export type ScheduleMode = "teacher" | "student" | "room";

// Неделя всегда начинается с понедельника: JS Date.getDay() даёт 0=вс..6=сб,
// смещение (day + 6) % 7 переводит это в 0=пн..6=вс.
function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// "YYYY-MM-DD" через new Date(...) парсится как UTC-полночь, а весь остальной код здесь
// (getDay/setHours) работает в локальном времени сервера — на машине с часовым поясом
// западнее UTC это сдвигало день недели на -1 (неделя внезапно начиналась с воскресенья).
// Разбираем строку вручную, чтобы получить локальную календарную дату без сдвига.
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function resolveRange(view: ScheduleView, dateParam?: string): { rangeStart: Date; rangeEnd: Date } {
  const base = dateParam ? parseLocalDate(dateParam) : new Date();
  if (Number.isNaN(base.getTime())) throw new BadRequestException("Некорректная дата");

  if (view === "day") {
    const rangeStart = startOfDay(base);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    return { rangeStart, rangeEnd };
  }
  if (view === "month") {
    const rangeStart = startOfMonth(base);
    const rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1);
    return { rangeStart, rangeEnd };
  }
  const rangeStart = startOfWeekMonday(base);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  return { rangeStart, rangeEnd };
}

// Разворачивает еженедельно повторяющиеся слоты групп в конкретные даты внутри диапазона —
// работает одинаково для дня/недели/месяца: просто перебирает каждый день диапазона.
function expandGroupOccurrences(
  groups: {
    id: string;
    name: string;
    color: string;
    scheduleSlots: { dayOfWeek: number; startMinutes: number; endMinutes: number; roomId: string | null; room: { name: string } | null }[];
  }[],
  rangeStart: Date,
  rangeEnd: Date,
) {
  const occurrences: {
    groupId: string;
    groupName: string;
    groupColor: string;
    date: string;
    startTime: string;
    endTime: string;
    roomId: string | null;
    roomName: string | null;
  }[] = [];

  for (const d = new Date(rangeStart); d < rangeEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = toDateString(d);
    for (const group of groups) {
      for (const slot of group.scheduleSlots) {
        if (slot.dayOfWeek !== dayOfWeek) continue;
        occurrences.push({
          groupId: group.id,
          groupName: group.name,
          groupColor: group.color,
          date: dateStr,
          startTime: minutesToTime(slot.startMinutes),
          endTime: minutesToTime(slot.endMinutes),
          roomId: slot.roomId,
          roomName: slot.room?.name ?? null,
        });
      }
    }
  }

  return occurrences.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchedule(
    tenantId: string,
    user: JwtPayload,
    view: ScheduleView,
    mode: ScheduleMode,
    dateParam?: string,
    targetIdParam?: string,
  ) {
    const { rangeStart, rangeEnd } = resolveRange(view, dateParam);

    if (mode === "student") {
      if (!targetIdParam) throw new BadRequestException("Не указан ученик");
      const student = await this.prisma.student.findFirst({
        where: { id: targetIdParam, tenantId },
        include: { group: { include: { scheduleSlots: { include: { room: { select: { name: true } } } } } } },
      });
      if (!student) throw new NotFoundException("Ученик не найден");

      const groupOccurrences = expandGroupOccurrences([student.group], rangeStart, rangeEnd);

      const participations = await this.prisma.individualLessonParticipant.findMany({
        where: {
          studentId: targetIdParam,
          individualLesson: { tenantId, startAt: { gte: rangeStart, lt: rangeEnd } },
        },
        include: { individualLesson: { include: WITH_DETAILS } },
      });
      const individualLessons = participations.map((p) => mapLesson(p.individualLesson));

      return { view, rangeStart: toDateString(rangeStart), rangeEnd: toDateString(rangeEnd), groupOccurrences, individualLessons };
    }

    if (mode === "room") {
      if (!targetIdParam) throw new BadRequestException("Не указан зал");
      const room = await this.prisma.room.findFirst({ where: { id: targetIdParam, tenantId } });
      if (!room) throw new NotFoundException("Зал не найден");

      const groups = await this.prisma.group.findMany({
        where: { tenantId, scheduleSlots: { some: { roomId: targetIdParam } } },
        include: { scheduleSlots: { where: { roomId: targetIdParam }, include: { room: { select: { name: true } } } } },
      });
      const groupOccurrences = expandGroupOccurrences(groups, rangeStart, rangeEnd);

      const lessons = await this.prisma.individualLesson.findMany({
        where: { tenantId, roomId: targetIdParam, startAt: { gte: rangeStart, lt: rangeEnd } },
        include: WITH_DETAILS,
        orderBy: { startAt: "asc" },
      });

      return {
        view,
        rangeStart: toDateString(rangeStart),
        rangeEnd: toDateString(rangeEnd),
        groupOccurrences,
        individualLessons: lessons.map(mapLesson),
      };
    }

    // mode === "teacher"
    let teacherId = user.sub;
    if (user.role === Role.SUPER_ADMIN && targetIdParam) {
      const teacher = await this.prisma.user.findFirst({ where: { id: targetIdParam, tenantId, role: Role.TEACHER } });
      if (!teacher) throw new NotFoundException("Преподаватель не найден");
      teacherId = targetIdParam;
    }

    const groups = await this.prisma.group.findMany({
      where: { tenantId, teachers: { some: { id: teacherId } } },
      include: { scheduleSlots: { include: { room: { select: { name: true } } } } },
    });
    const groupOccurrences = expandGroupOccurrences(groups, rangeStart, rangeEnd);

    const lessons = await this.prisma.individualLesson.findMany({
      where: { tenantId, teacherId, startAt: { gte: rangeStart, lt: rangeEnd } },
      include: WITH_DETAILS,
      orderBy: { startAt: "asc" },
    });

    return {
      view,
      rangeStart: toDateString(rangeStart),
      rangeEnd: toDateString(rangeEnd),
      groupOccurrences,
      individualLessons: lessons.map(mapLesson),
    };
  }
}
