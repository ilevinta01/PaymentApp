import { Controller, Get } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { PaymentLogsService } from "./payment-logs.service";

@Roles(Role.SUPER_ADMIN)
@Controller("payment-logs")
export class PaymentLogsController {
  constructor(private readonly service: PaymentLogsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }
}
