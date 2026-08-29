import { Body, Controller, Get, Patch } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "./decorators/require-feature.decorator";
import { UpdateTenantSettingsDto } from "./dto/update-tenant-settings.dto";
import { TenantSettingsService } from "./tenant-settings.service";

@Controller("tenant-settings")
export class TenantSettingsController {
  constructor(private readonly service: TenantSettingsService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.service.get(user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN)
  @RequireFeature("isTelegramEnabled")
  @Get("telegram-chats")
  getTelegramChats(@CurrentUser() user: JwtPayload) {
    return this.service.getTelegramChats(user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTenantSettingsDto) {
    return this.service.update(user.tenantId, dto);
  }
}
