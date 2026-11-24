import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "./students.service";

// Автоматическое обезличивание по сроку хранения: если в центре включён срок (retentionYears),
// каждую ночь обезличиваются ученики, по которым за этот срок не было ни оплат, ни занятий.
// Ученики с деньгами на балансе пропускаются — там остаются обязательства перед семьёй.
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
  ) {}

  @Cron("0 3 * * *")
  async runNightly() {
    const tenants = await this.prisma.tenantSettings.findMany({
      where: { retentionYears: { not: null } },
      select: { tenantId: true, retentionYears: true },
    });
    for (const { tenantId, retentionYears } of tenants) {
      const count = await this.anonymizeExpired(tenantId, retentionYears!);
      if (count > 0) this.logger.log(`Обезличено учеников по сроку хранения: ${count}`);
    }
  }

  async anonymizeExpired(tenantId: string, years: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);

    const candidates = await this.prisma.student.findMany({
      where: {
        tenantId,
        anonymizedAt: null,
        createdAt: { lt: cutoff },
        balance: { lte: 0 },
        payments: { none: { dateTime: { gte: cutoff } } },
        individualLessonShares: { none: { individualLesson: { startAt: { gte: cutoff } } } },
      },
      select: { id: true },
    });

    let done = 0;
    for (const { id } of candidates) {
      try {
        await this.students.anonymize(tenantId, id, null, "RETENTION");
        done++;
      } catch (error) {
        // Например, другой экземпляр сервера уже обезличил этого ученика одновременно.
        this.logger.warn(`Не удалось обезличить ученика по сроку хранения: ${(error as Error).message}`);
      }
    }
    return done;
  }
}
