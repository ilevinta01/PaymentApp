import { Controller, Get, Header, Query, StreamableFile } from "@nestjs/common";
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

  @RequireFeature("isPaymentsReportEnabled")
  @Get("payments-by-group")
  getPaymentsByGroup(@CurrentUser() user: JwtPayload, @Query("periodMonth") periodMonth?: string) {
    return this.service.getPaymentsByGroup(user.tenantId, periodMonth);
  }

  @RequireFeature("isPaymentsReportEnabled")
  @Get("payments-by-group/export")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @Header("Content-Disposition", 'attachment; filename="payments-report.xlsx"')
  async exportPaymentsByGroup(
    @CurrentUser() user: JwtPayload,
    @Query("periodMonth") periodMonth?: string,
    @Query("groupId") groupId?: string,
  ): Promise<StreamableFile> {
    const buffer = await this.service.exportPaymentsByGroupExcel(user.tenantId, periodMonth, groupId);
    return new StreamableFile(buffer);
  }

  @RequireFeature("isIndividualDebtorsReportEnabled")
  @Get("individual-debtors")
  getIndividualDebtors(@CurrentUser() user: JwtPayload) {
    return this.service.getIndividualDebtors(user.tenantId);
  }

  @RequireFeature("isChangeLogEnabled")
  @Get("change-log")
  getChangeLog(
    @CurrentUser() user: JwtPayload,
    @Query("category") category?: string,
    @Query("actorId") actorId?: string,
  ) {
    return this.service.getChangeLog(user.tenantId, category, actorId);
  }

  @RequireFeature("isTeacherEarningsEnabled")
  @Get("teacher-earnings")
  getTeacherEarnings(@CurrentUser() user: JwtPayload, @Query("periodMonth") periodMonth?: string) {
    return this.service.getTeacherEarnings(user.tenantId, periodMonth);
  }
}
