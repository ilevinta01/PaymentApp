import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SubscriptionStatus } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DebtorsService } from "./debtors.service";
import { getCurrentPeriodMonth } from "../common/period";

@Injectable()
export class DebtorsCronService {
  private readonly logger = new Logger(DebtorsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly debtorsService: DebtorsService,
  ) {}

  // Каждое 11-е число месяца в 00:01 — сканирует все активные оплаченные тенанты (ТЗ п.2.2).
  @Cron("1 0 11 * *")
  async scanAllTenants() {
    const periodMonth = getCurrentPeriodMonth();
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const activeTenants = await this.prisma.tenant.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionPaidUntil: { gte: firstDayOfMonth },
      },
    });

    for (const tenant of activeTenants) {
      const debtors = await this.debtorsService.getDebtors(tenant.id);
      this.logger.log(`Тенант "${tenant.name}": ${debtors.length} должников за ${periodMonth}`);
    }
  }
}
