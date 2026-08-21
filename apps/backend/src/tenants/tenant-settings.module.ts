import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { TenantSettingsController } from "./tenant-settings.controller";
import { TenantSettingsService } from "./tenant-settings.service";

@Module({
  imports: [TelegramModule],
  controllers: [TenantSettingsController],
  providers: [TenantSettingsService],
})
export class TenantSettingsModule {}
