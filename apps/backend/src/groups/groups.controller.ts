import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { CreateGroupDto } from "./dto/create-group.dto";
import { CreateScheduleSlotDto } from "./dto/create-schedule-slot.dto";
import { SetGroupTeachersDto } from "./dto/set-group-teachers.dto";
import { UpdateScheduleSlotDto } from "./dto/update-schedule-slot.dto";
import { GroupsService } from "./groups.service";

@Controller("groups")
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAllForUser(user.tenantId, user);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: Partial<CreateGroupDto>) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.remove(user.tenantId, id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(":id/teachers")
  setTeachers(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: SetGroupTeachersDto) {
    return this.service.setTeachers(user.tenantId, id, dto);
  }

  @RequireFeature("isScheduleEnabled")
  @Roles(Role.SUPER_ADMIN)
  @Post(":id/schedule-slots")
  addScheduleSlot(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: CreateScheduleSlotDto) {
    return this.service.addScheduleSlot(user.tenantId, id, dto);
  }

  @RequireFeature("isScheduleEnabled")
  @Roles(Role.SUPER_ADMIN)
  @Patch("schedule-slots/:slotId")
  updateScheduleSlot(
    @CurrentUser() user: JwtPayload,
    @Param("slotId") slotId: string,
    @Body() dto: UpdateScheduleSlotDto,
  ) {
    return this.service.updateScheduleSlot(user.tenantId, slotId, dto);
  }

  @RequireFeature("isScheduleEnabled")
  @Roles(Role.SUPER_ADMIN)
  @Delete("schedule-slots/:slotId")
  removeScheduleSlot(@CurrentUser() user: JwtPayload, @Param("slotId") slotId: string) {
    return this.service.removeScheduleSlot(user.tenantId, slotId);
  }
}
