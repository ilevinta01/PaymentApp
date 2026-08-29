import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { SubscriptionGuard } from "./auth/guards/subscription.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { TenantFeatureGuard } from "./tenants/guards/tenant-feature.guard";
import { TenantSettingsModule } from "./tenants/tenant-settings.module";
import { UsersModule } from "./users/users.module";
import { GroupsModule } from "./groups/groups.module";
import { StudentsModule } from "./students/students.module";
import { PaymentsModule } from "./payments/payments.module";
import { DebtorsModule } from "./debtors/debtors.module";
import { PaymentLogsModule } from "./payment-logs/payment-logs.module";
import { PlatformModule } from "./platform/platform.module";
import { ReportsModule } from "./reports/reports.module";
import { CashCollectionsModule } from "./cash-collections/cash-collections.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantSettingsModule,
    UsersModule,
    GroupsModule,
    StudentsModule,
    PaymentsModule,
    DebtorsModule,
    PaymentLogsModule,
    PlatformModule,
    ReportsModule,
    CashCollectionsModule,
    HealthModule,
  ],
  providers: [
    // Порядок важен: сначала аутентификация (JWT), затем проверка подписки тенанта,
    // затем проверка роли — каждый следующий guard может рассчитывать на request.user.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantFeatureGuard },
  ],
})
export class AppModule {}
