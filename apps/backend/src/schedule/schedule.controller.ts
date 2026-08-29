import { Controller, Get, Query } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { ScheduleService } from "./schedule.service";

@RequireFeature("isIndividualLessonsEnabled")
@Roles(Role.SUPER_ADMIN, Role.TEACHER)
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get()
  getWeeklySchedule(
    @CurrentUser() user: JwtPayload,
    @Query("weekStart") weekStart?: string,
    @Query("teacherId") teacherId?: string,
  ) {
    return this.service.getWeeklySchedule(user.tenantId, user, weekStart, teacherId);
  }
}
