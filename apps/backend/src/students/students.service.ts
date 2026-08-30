import { ForbiddenException, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { getCurrentPeriodMonth } from "../common/period";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { DepositBalanceDto } from "./dto/deposit-balance.dto";
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
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { payments: true, individualLessonShares: true } } },
    });
    if (!student) throw new NotFoundException("Ученик не найден");
    if (student._count.payments > 0 || student._count.individualLessonShares > 0) {
      throw new BadRequestException(
        "У ученика есть история оплат — удалить его нельзя, чтобы не потерять финансовые записи. Переведите его в архивную группу или переведите в другую группу вместо удаления.",
      );
    }
    await this.prisma.student.delete({ where: { id } });
    return { success: true };
  }

  // Пополняет баланс (аванс) ученика. Деньги просто ложатся на баланс и лежат там —
  // никакого автоматического списания в счёт будущих месяцев. Списание — отдельное явное
  // действие (оплата за месяц/индивидуальное занятие с выбором способа "с баланса").
  async depositBalance(tenantId: string, user: JwtPayload, studentId: string, dto: DepositBalanceDto) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException("Ученик не найден");

    if (dto.paymentMethod === "CARD") {
      const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
      if (!settings?.isCardEnabled) {
        throw new ForbiddenException("Оплата картой не включена в настройках детского центра");
      }
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

    return (await this.withPaidStatus(tenantId, [updated]))[0];
  }

  async getBalanceTransactions(tenantId: string, studentId: string) {
    return this.prisma.balanceTransaction.findMany({
      where: { tenantId, studentId },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
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
