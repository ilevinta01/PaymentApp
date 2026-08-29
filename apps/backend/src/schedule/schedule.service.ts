import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { minutesToTime } from "../groups/groups.service";
import { mapLesson, WITH_DETAILS } from "../individual-lessons/individual-lessons.service";
import { PrismaService } from "../prisma/prisma.service";

// Неделя всегда начинается с понедельника: JS Date.getDay() даёт 0=вс..6=сб,
// смещение (day + 6) % 7 переводит это в 0=пн..6=вс.
function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function dateForDayOfWeek(weekStartMonday: Date, dayOfWeek: number): Date {
  const offset = (dayOfWeek + 6) % 7;
  const d = new Date(weekStartMonday);
  d.setDate(d.getDate() + offset);
  return d;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklySchedule(
    tenantId: string,
    user: JwtPayload,
    weekStartParam?: string,
    teacherIdParam?: string,
  ) {
    let teacherId = user.sub;
    if (user.role === Role.SUPER_ADMIN && teacherIdParam) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: teacherIdParam, tenantId, role: Role.TEACHER },
      });
      if (!teacher) throw new NotFoundException("Преподаватель не найден");
      teacherId = teacherIdParam;
    }

    const weekStart = startOfWeekMonday(weekStartParam ? new Date(weekStartParam) : new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const groups = await this.prisma.group.findMany({
      where: { tenantId, teachers: { some: { id: teacherId } } },
      include: { scheduleSlots: true },
    });

    const groupOccurrences = groups
      .flatMap((group) =>
        group.scheduleSlots.map((slot) => ({
          groupId: group.id,
          groupName: group.name,
          date: toDateString(dateForDayOfWeek(weekStart, slot.dayOfWeek)),
          startTime: minutesToTime(slot.startMinutes),
          endTime: minutesToTime(slot.endMinutes),
        })),
      )
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const lessons = await this.prisma.individualLesson.findMany({
      where: { tenantId, teacherId, startAt: { gte: weekStart, lt: weekEnd } },
      include: WITH_DETAILS,
      orderBy: { startAt: "asc" },
    });

    return {
      weekStart: toDateString(weekStart),
      groupOccurrences,
      individualLessons: lessons.map(mapLesson),
    };
  }
}
