import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Roles(Role.SUPER_ADMIN)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(":id/active")
  setActive(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body("isActive") isActive: boolean) {
    return this.service.setActive(user.tenantId, id, isActive);
  }
}
