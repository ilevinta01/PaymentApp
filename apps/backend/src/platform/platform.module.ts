import { Module } from "@nestjs/common";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, PlatformAdminGuard],
})
export class PlatformModule {}
