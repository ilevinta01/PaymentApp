import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramBotService } from "../telegram/telegram-bot.service";
import { UpdateTenantSettingsDto } from "./dto/update-tenant-settings.dto";

@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  async get(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return (
      settings ?? {
        tenantId,
        isCardEnabled: false,
        isTelegramEnabled: false,
        isCashCollectionEnabled: false,
        isTeacherEarningsEnabled: false,
        isIndividualLessonsEnabled: false,
        isScheduleEnabled: false,
        isPaymentsReportEnabled: false,
        isDebtorsReportEnabled: false,
        isIndividualDebtorsReportEnabled: false,
        isChangeLogEnabled: false,
        telegramBotToken: null,
        primaryColor: null,
        logoUrl: null,
        individualLessonColor: "#f59e0b",
      }
    );
  }

  async update(tenantId: string, dto: UpdateTenantSettingsDto) {
    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });

    // Новый токен бота — подключаем бота к нашему серверу, чтобы он мог показывать родителям
    // политику конфиденциальности и принимать согласие.
    if (dto.telegramBotToken) {
      await this.telegramBot.registerWebhook(tenantId, dto.telegramBotToken);
    }
    return settings;
  }

  getTelegramChats(tenantId: string) {
    return this.telegramBot.listChats(tenantId);
  }
}
