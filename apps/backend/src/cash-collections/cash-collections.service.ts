import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod, Role } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCashCollectionDto } from "./dto/create-cash-collection.dto";

@Injectable()
export class CashCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(tenantId: string) {
    const teachers = await this.prisma.user.findMany({
      where: { tenantId, role: Role.TEACHER },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });

    const balances = await Promise.all(
      teachers.map(async (teacher) => ({
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        balance: (await this.computeBalance(tenantId, teacher.id)).toFixed(2),
      })),
    );

    return balances;
  }

  async create(tenantId: string, collectedById: string, dto: CreateCashCollectionDto) {
    const teacher = await this.prisma.user.findFirst({ where: { id: dto.teacherId, tenantId } });
    if (!teacher) throw new NotFoundException("Преподаватель не найден");

    const balance = await this.computeBalance(tenantId, dto.teacherId);
    if (balance <= 0) throw new BadRequestException("У преподавателя нет накопленной наличности");

    const amount = dto.amount ?? balance;
    if (amount > balance) {
      throw new BadRequestException("Сумма изъятия превышает текущий баланс преподавателя");
    }

    const collection = await this.prisma.cashCollection.create({
      data: { tenantId, teacherId: dto.teacherId, amount, collectedById },
      include: { teacher: { select: { fullName: true } }, collectedBy: { select: { fullName: true } } },
    });

    return {
      id: collection.id,
      teacherId: collection.teacherId,
      teacherName: collection.teacher.fullName,
      amount: collection.amount.toString(),
      collectedByName: collection.collectedBy.fullName,
      collectedAt: collection.collectedAt,
    };
  }

  async findAll(tenantId: string) {
    const collections = await this.prisma.cashCollection.findMany({
      where: { tenantId },
      include: { teacher: { select: { fullName: true } }, collectedBy: { select: { fullName: true } } },
      orderBy: { collectedAt: "desc" },
    });

    return collections.map((collection) => ({
      id: collection.id,
      teacherId: collection.teacherId,
      teacherName: collection.teacher.fullName,
      amount: collection.amount.toString(),
      collectedByName: collection.collectedBy.fullName,
      collectedAt: collection.collectedAt,
    }));
  }

  // Баланс = сумма принятых наличными платежей минус то, что уже изъято администратором.
  private async computeBalance(tenantId: string, teacherId: string): Promise<number> {
    const [payments, collections] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, createdById: teacherId, paymentMethod: PaymentMethod.CASH },
        select: { amount: true },
      }),
      this.prisma.cashCollection.findMany({ where: { tenantId, teacherId }, select: { amount: true } }),
    ]);

    const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const withdrawn = collections.reduce((sum, c) => sum + Number(c.amount), 0);
    return collected - withdrawn;
  }
}
