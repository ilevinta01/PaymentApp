import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateGroupDto } from "./dto/create-group.dto";
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
}
