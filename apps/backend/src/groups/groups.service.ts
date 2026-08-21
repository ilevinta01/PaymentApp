import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // Преподаватель видит только группы, к которым у него есть допуск (может быть несколько
  // преподавателей на одну группу); Супер-Админ — все группы тенанта без ограничений.
  findAllForUser(tenantId: string, user: JwtPayload) {
    return this.prisma.group.findMany({
      where: {
        tenantId,
        ...(user.role === Role.TEACHER ? { teachers: { some: { id: user.sub } } } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  create(tenantId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        tenantId,
        name: dto.name,
        monthlyPrice: dto.monthlyPrice,
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateGroupDto>) {
    const group = await this.prisma.group.findFirst({ where: { id, tenantId } });
    if (!group) throw new NotFoundException("Группа не найдена");
    return this.prisma.group.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const group = await this.prisma.group.findFirst({ where: { id, tenantId } });
    if (!group) throw new NotFoundException("Группа не найдена");
    await this.prisma.group.delete({ where: { id } });
    return { success: true };
  }
}
