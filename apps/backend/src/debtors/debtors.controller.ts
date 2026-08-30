import { Controller, Get } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { DebtorsService } from "./debtors.service";

@RequireFeature("isDebtorsReportEnabled")
@Roles(Role.SUPER_ADMIN)
@Controller("debtors")
export class DebtorsController {
  constructor(private readonly service: DebtorsService) {}

  @Get()
  getDebtors(@CurrentUser() user: JwtPayload) {
    return this.service.getDebtorsByGroup(user.tenantId);
  }
}
