import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService } from "../telegram/telegram.service";
import { UpdateTenantSettingsDto } from "./dto/update-tenant-settings.dto";

@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async get(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return settings ?? { tenantId, isCardEnabled: false, telegramBotToken: null };
  }

  update(tenantId: string, dto: UpdateTenantSettingsDto) {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
  }

  async getTelegramChats(tenantId: string) {
    const settings = await this.get(tenantId);
    if (!settings.telegramBotToken) {
      throw new BadRequestException("Сначала укажите токен Telegram-бота в настройках");
    }
    return this.telegram.getRecentChats(settings.telegramBotToken);
  }
}
