import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.room.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  async create(tenantId: string, dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: { tenantId, name: dto.name },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findFirst({ where: { id, tenantId } });
    if (!room) throw new NotFoundException("Зал не найден");
    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    const room = await this.prisma.room.findFirst({ where: { id, tenantId } });
    if (!room) throw new NotFoundException("Зал не найден");
    await this.prisma.room.delete({ where: { id } });
  }
}
