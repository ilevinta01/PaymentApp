import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

// Публичный эндпоинт для внешнего keep-alive пинга (например, cron-job.org) —
// не даёт бесплатной базе Supabase заснуть из-за долгого простоя без запросов.
@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", time: new Date().toISOString() };
  }
}
