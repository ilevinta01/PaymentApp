import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { RoomsService } from "./rooms.service";

@RequireFeature("isScheduleEnabled")
@Controller("rooms")
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
