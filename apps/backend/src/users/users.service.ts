import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  groupsTaught: { select: { id: true } },
} as const;

type RawUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  groupsTaught: { id: string }[];
};

function mapUser(user: RawUser) {
  const { groupsTaught, ...rest } = user;
  return { ...rest, groupIds: groupsTaught.map((g) => g.id) };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: SAFE_SELECT,
      orderBy: { fullName: "asc" },
    });
    return users.map(mapUser);
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Пользователь с таким email уже существует");

    if (dto.groupIds?.length) {
      await this.assertGroupsBelongToTenant(tenantId, dto.groupIds);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        role: dto.role,
        ...(dto.groupIds?.length ? { groupsTaught: { connect: dto.groupIds.map((id) => ({ id })) } } : {}),
      },
      select: SAFE_SELECT,
    });

    return mapUser(user);
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException("Сотрудник не найден");

    if (dto.groupIds?.length) {
      await this.assertGroupsBelongToTenant(tenantId, dto.groupIds);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        // "set" полностью заменяет набор групп этого преподавателя, не трогая
        // назначения других преподавателей на те же группы (связь многие-ко-многим).
        ...(dto.groupIds !== undefined ? { groupsTaught: { set: dto.groupIds.map((id) => ({ id })) } } : {}),
      },
      select: SAFE_SELECT,
    });

    return mapUser(updated);
  }

  async setActive(tenantId: string, userId: string, isActive: boolean) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException("Сотрудник не найден");
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { isActive }, select: SAFE_SELECT });
    return mapUser(updated);
  }

  private async assertGroupsBelongToTenant(tenantId: string, groupIds: string[]) {
    const found = await this.prisma.group.findMany({ where: { id: { in: groupIds }, tenantId }, select: { id: true } });
    if (found.length !== groupIds.length) {
      throw new BadRequestException("Некоторые группы не найдены");
    }
  }
}
