import { Controller, Get, Query } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { ScheduleMode, ScheduleService, ScheduleView } from "./schedule.service";

@RequireFeature("isScheduleEnabled")
@Roles(Role.SUPER_ADMIN, Role.TEACHER)
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get()
  getSchedule(
    @CurrentUser() user: JwtPayload,
    @Query("view") view: ScheduleView = "week",
    @Query("mode") mode: ScheduleMode = "teacher",
    @Query("date") date?: string,
    @Query("targetId") targetId?: string,
  ) {
    return this.service.getSchedule(user.tenantId, user, view, mode, date, targetId);
  }
}
