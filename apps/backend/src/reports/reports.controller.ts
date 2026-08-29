import { Controller, Get, Query } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { ReportsService } from "./reports.service";

@Roles(Role.SUPER_ADMIN)
@Controller("reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("summary")
  getSummary(@CurrentUser() user: JwtPayload, @Query("periodMonth") periodMonth?: string) {
    return this.service.getSummary(user.tenantId, periodMonth);
  }

  @RequireFeature("isTeacherEarningsEnabled")
  @Get("teacher-earnings")
  getTeacherEarnings(@CurrentUser() user: JwtPayload, @Query("periodMonth") periodMonth?: string) {
    return this.service.getTeacherEarnings(user.tenantId, periodMonth);
  }
}
