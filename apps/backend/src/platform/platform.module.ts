import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformController } from "./platform.controller";
import { PlatformFeaturesController } from "./platform-features.controller";
import { PlatformService } from "./platform.service";

@Module({
  imports: [AuthModule],
  controllers: [PlatformController, PlatformFeaturesController],
  providers: [PlatformService, PlatformAdminGuard],
})
export class PlatformModule {}
