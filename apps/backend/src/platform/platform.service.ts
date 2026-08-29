import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role, SubscriptionStatus } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        settings: { select: { primaryColor: true, logoUrl: true } },
        _count: { select: { users: true, students: true } },
        users: {
          where: { role: Role.SUPER_ADMIN },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { fullName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionPaidUntil: tenant.subscriptionPaidUntil,
      createdAt: tenant.createdAt,
      usersCount: tenant._count.users,
      studentsCount: tenant._count.students,
      contractFileUrl: tenant.contractFileUrl,
      contractUploadedAt: tenant.contractUploadedAt,
      primaryColor: tenant.settings?.primaryColor ?? null,
      logoUrl: tenant.settings?.logoUrl ?? null,
      owner: tenant.users[0] ?? null,
    }));
  }

  getTenant(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async createTenant(dto: CreateTenantDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.superAdminEmail } });
    if (existingUser) throw new ConflictException("Пользователь с таким email уже существует");

    const passwordHash = await bcrypt.hash(dto.superAdminPassword, 10);
    const now = new Date();
    // Новому центру сразу открывается доступ до конца текущего календарного месяца.
    const subscriptionPaidUntil = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionPaidUntil,
        settings: { create: { isCardEnabled: false } },
        users: {
          create: {
            email: dto.superAdminEmail,
            passwordHash,
            fullName: dto.superAdminFullName,
            phone: dto.superAdminPhone ?? null,
            role: Role.SUPER_ADMIN,
          },
        },
      },
      select: { id: true, name: true, subscriptionStatus: true, subscriptionPaidUntil: true },
    });
  }

  async updateSubscription(tenantId: string, dto: UpdateSubscriptionDto) {
    if (!dto.subscriptionStatus && !dto.subscriptionPaidUntil) {
      throw new BadRequestException("Не указаны изменения подписки");
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.subscriptionStatus ? { subscriptionStatus: dto.subscriptionStatus } : {}),
        ...(dto.subscriptionPaidUntil ? { subscriptionPaidUntil: new Date(dto.subscriptionPaidUntil) } : {}),
      },
    });
  }

  saveContract(tenantId: string, filename: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { contractFileUrl: filename, contractUploadedAt: new Date() },
      select: { id: true, contractFileUrl: true, contractUploadedAt: true },
    });
  }

  updateBranding(tenantId: string, primaryColor: string) {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, primaryColor },
      update: { primaryColor },
    });
  }

  saveLogo(tenantId: string, logoUrl: string) {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, logoUrl },
      update: { logoUrl },
    });
  }
}
