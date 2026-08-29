import { Module } from "@nestjs/common";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformController } from "./platform.controller";
import { PlatformFeaturesController } from "./platform-features.controller";
import { PlatformService } from "./platform.service";

@Module({
  controllers: [PlatformController, PlatformFeaturesController],
  providers: [PlatformService, PlatformAdminGuard],
})
export class PlatformModule {}
