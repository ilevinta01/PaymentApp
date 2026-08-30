import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { CreateScheduleSlotDto } from "./dto/create-schedule-slot.dto";
import { SetGroupTeachersDto } from "./dto/set-group-teachers.dto";
import { UpdateScheduleSlotDto } from "./dto/update-schedule-slot.dto";

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function mapSlot(slot: {
  id: string;
  groupId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  roomId: string | null;
  room?: { name: string } | null;
}) {
  return {
    id: slot.id,
    groupId: slot.groupId,
    dayOfWeek: slot.dayOfWeek,
    startTime: minutesToTime(slot.startMinutes),
    endTime: minutesToTime(slot.endMinutes),
    roomId: slot.roomId,
    roomName: slot.room?.name ?? null,
  };
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // Преподаватель видит только группы, к которым у него есть допуск (может быть несколько
  // преподавателей на одну группу); Супер-Админ — все группы тенанта без ограничений.
  async findAllForUser(tenantId: string, user: JwtPayload) {
    const groups = await this.prisma.group.findMany({
      where: {
        tenantId,
        ...(user.role === Role.TEACHER ? { teachers: { some: { id: user.sub } } } : {}),
      },
      include: {
        scheduleSlots: { include: { room: { select: { name: true } } } },
        teachers: { select: { id: true, fullName: true } },
      },
      orderBy: { name: "asc" },
    });
    return groups.map((g) => ({ ...g, scheduleSlots: g.scheduleSlots.map(mapSlot) }));
  }

  create(tenantId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        tenantId,
        name: dto.name,
        monthlyPrice: dto.monthlyPrice,
        ...(dto.color ? { color: dto.color } : {}),
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateGroupDto>) {
    const group = await this.prisma.group.findFirst({ where: { id, tenantId } });
    if (!group) throw new NotFoundException("Группа не найдена");
    return this.prisma.group.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { students: true } } },
    });
    if (!group) throw new NotFoundException("Группа не найдена");
    if (group._count.students > 0) {
      throw new BadRequestException(
        "Сначала переведите или удалите всех учеников этой группы — только потом её можно удалить",
      );
    }
    await this.prisma.group.delete({ where: { id } });
    return { success: true };
  }

  async setTeachers(tenantId: string, groupId: string, dto: SetGroupTeachersDto) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, tenantId } });
    if (!group) throw new NotFoundException("Группа не найдена");

    if (dto.teacherIds.length > 0) {
      const found = await this.prisma.user.findMany({
        where: { id: { in: dto.teacherIds }, tenantId, role: Role.TEACHER },
        select: { id: true },
      });
      if (found.length !== dto.teacherIds.length) {
        throw new BadRequestException("Некоторые преподаватели не найдены");
      }
    }

    await this.prisma.group.update({
      where: { id: groupId },
      data: { teachers: { set: dto.teacherIds.map((id) => ({ id })) } },
    });
    return { success: true };
  }

  private async resolveRoomId(tenantId: string, roomId: string | undefined): Promise<string | null | undefined> {
    if (roomId === undefined) return undefined;
    if (!roomId) return null;
    const room = await this.prisma.room.findFirst({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException("Зал не найден");
    return roomId;
  }

  async addScheduleSlot(tenantId: string, groupId: string, dto: CreateScheduleSlotDto) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, tenantId } });
    if (!group) throw new NotFoundException("Группа не найдена");

    const startMinutes = timeToMinutes(dto.startTime);
    const endMinutes = timeToMinutes(dto.endTime);
    if (endMinutes <= startMinutes) {
      throw new BadRequestException("Время окончания должно быть позже времени начала");
    }

    const roomId = await this.resolveRoomId(tenantId, dto.roomId);

    const slot = await this.prisma.groupScheduleSlot.create({
      data: { groupId, dayOfWeek: dto.dayOfWeek, startMinutes, endMinutes, roomId: roomId || null },
      include: { room: { select: { name: true } } },
    });
    return mapSlot(slot);
  }

  async updateScheduleSlot(tenantId: string, slotId: string, dto: UpdateScheduleSlotDto) {
    const slot = await this.prisma.groupScheduleSlot.findFirst({ where: { id: slotId, group: { tenantId } } });
    if (!slot) throw new NotFoundException("Слот расписания не найден");

    const startMinutes = timeToMinutes(dto.startTime);
    const endMinutes = timeToMinutes(dto.endTime);
    if (endMinutes <= startMinutes) {
      throw new BadRequestException("Время окончания должно быть позже времени начала");
    }

    const roomId = await this.resolveRoomId(tenantId, dto.roomId);

    const updated = await this.prisma.groupScheduleSlot.update({
      where: { id: slotId },
      data: { startMinutes, endMinutes, ...(roomId !== undefined ? { roomId } : {}) },
      include: { room: { select: { name: true } } },
    });
    return mapSlot(updated);
  }

  async removeScheduleSlot(tenantId: string, slotId: string) {
    const slot = await this.prisma.groupScheduleSlot.findFirst({
      where: { id: slotId, group: { tenantId } },
    });
    if (!slot) throw new NotFoundException("Слот расписания не найден");
    await this.prisma.groupScheduleSlot.delete({ where: { id: slotId } });
    return { success: true };
  }
}
