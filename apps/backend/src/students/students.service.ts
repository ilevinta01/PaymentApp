import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpdateStudentStatusDto } from "./dto/update-student-status.dto";

const WITH_GROUP = {
  group: { select: { id: true, name: true, monthlyPrice: true } },
} as const;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Преподаватель видит только учеников своих групп, Супер-Админ — всех учеников тенанта.
  async findAllForUser(
    tenantId: string,
    user: JwtPayload,
    options: { search?: string; groupId?: string } = {},
  ) {
    const students = await this.prisma.student.findMany({
      where: {
        tenantId,
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
    const student = await this.prisma.student.findFirst({ where: { id, tenantId } });
    if (!student) throw new NotFoundException("Ученик не найден");
    await this.prisma.student.delete({ where: { id } });
    return { success: true };
  }

  // Помечает каждого ученика признаком оплаты за текущий расчётный месяц.
  private async withPaidStatus<T extends { id: string }>(tenantId: string, students: T[]) {
    if (students.length === 0) return [] as (T & { isPaidCurrentMonth: boolean })[];

    const periodMonth = getCurrentPeriodMonth();
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, periodMonth, studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true },
    });
    const paidIds = new Set(payments.map((p) => p.studentId));

    return students.map((student) => ({ ...student, isPaidCurrentMonth: paidIds.has(student.id) }));
  }
}
