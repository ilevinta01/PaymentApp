import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FEATURE_DEFINITIONS, Role, SubscriptionStatus } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { unusablePasswordHash } from "../auth/unusable-password";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateFeaturesDto } from "./dto/update-features.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

export type EffectiveTenantStatus = "ACTIVE" | "UNPAID" | "BLOCKED";

function getEffectiveStatus(tenant: { subscriptionStatus: string; subscriptionPaidUntil: Date }): EffectiveTenantStatus {
  if (tenant.subscriptionStatus === SubscriptionStatus.BLOCKED) return "BLOCKED";
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return tenant.subscriptionPaidUntil >= firstDayOfMonth ? "ACTIVE" : "UNPAID";
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        settings: {
          select: {
            primaryColor: true,
            logoUrl: true,
            isCardEnabled: true,
            isTelegramEnabled: true,
            isCashCollectionEnabled: true,
            isTeacherEarningsEnabled: true,
            isIndividualLessonsEnabled: true,
            isScheduleEnabled: true,
            isPaymentsReportEnabled: true,
            isDebtorsReportEnabled: true,
            isIndividualDebtorsReportEnabled: true,
            isChangeLogEnabled: true,
          },
        },
        _count: { select: { users: true, students: true } },
        users: {
          where: { role: Role.SUPER_ADMIN },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true, fullName: true, email: true, phone: true, emailVerifiedAt: true, lockedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      subscriptionStatus: tenant.subscriptionStatus,
      effectiveStatus: getEffectiveStatus(tenant),
      subscriptionPaidUntil: tenant.subscriptionPaidUntil,
      createdAt: tenant.createdAt,
      usersCount: tenant._count.users,
      studentsCount: tenant._count.students,
      contractFileUrl: tenant.contractFileUrl,
      contractUploadedAt: tenant.contractUploadedAt,
      primaryColor: tenant.settings?.primaryColor ?? null,
      logoUrl: tenant.settings?.logoUrl ?? null,
      isCardEnabled: tenant.settings?.isCardEnabled ?? false,
      isTelegramEnabled: tenant.settings?.isTelegramEnabled ?? false,
      isCashCollectionEnabled: tenant.settings?.isCashCollectionEnabled ?? false,
      isTeacherEarningsEnabled: tenant.settings?.isTeacherEarningsEnabled ?? false,
      isIndividualLessonsEnabled: tenant.settings?.isIndividualLessonsEnabled ?? false,
      isScheduleEnabled: tenant.settings?.isScheduleEnabled ?? false,
      isPaymentsReportEnabled: tenant.settings?.isPaymentsReportEnabled ?? false,
      isDebtorsReportEnabled: tenant.settings?.isDebtorsReportEnabled ?? false,
      isIndividualDebtorsReportEnabled: tenant.settings?.isIndividualDebtorsReportEnabled ?? false,
      isChangeLogEnabled: tenant.settings?.isChangeLogEnabled ?? false,
      owner: tenant.users[0]
        ? {
            fullName: tenant.users[0].fullName,
            email: tenant.users[0].email,
            phone: tenant.users[0].phone,
            emailVerified: !!tenant.users[0].emailVerifiedAt,
            isLocked: !!tenant.users[0].lockedAt,
          }
        : null,
    }));
  }

  getTenant(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async createTenant(dto: CreateTenantDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.superAdminEmail } });
    if (existingUser) throw new ConflictException("Пользователь с таким email уже существует");

    const passwordHash = await unusablePasswordHash();
    const now = new Date();
    // Новому центру сразу открывается доступ до конца текущего календарного месяца.
    const subscriptionPaidUntil = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tenant = await this.prisma.tenant.create({
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
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPaidUntil: true,
        users: { select: { id: true } },
      },
    });

    // Владелец получает письмо: по ссылке он подтверждает email и сам задаёт пароль.
    const inviteSent = await this.auth.sendAccessLink(tenant.users[0].id, true);
    const { users: _users, ...rest } = tenant;
    return { ...rest, inviteSent };
  }

  /** Повторно отправить владельцу центра письмо (приглашение или восстановление пароля). */
  async resendOwnerInvite(tenantId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: Role.SUPER_ADMIN },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException("Владелец центра не найден");
    return { sent: await this.auth.sendAccessLink(owner.id, true) };
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

  updateFeatures(tenantId: string, dto: UpdateFeaturesDto) {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
  }

  async getFeaturePrices() {
    const prices = await this.prisma.featurePrice.findMany();
    const priceByKey = new Map(prices.map((p) => [p.key, Number(p.price)]));
    return FEATURE_DEFINITIONS.map((def) => ({ ...def, price: priceByKey.get(def.key) ?? 0 }));
  }

  updateFeaturePrice(key: string, price: number) {
    return this.prisma.featurePrice.upsert({
      where: { key },
      create: { key, price },
      update: { price },
    });
  }
}
