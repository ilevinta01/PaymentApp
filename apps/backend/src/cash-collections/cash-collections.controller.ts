import { Body, Controller, Get, Post } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { CashCollectionsService } from "./cash-collections.service";
import { CreateCashCollectionDto } from "./dto/create-cash-collection.dto";

@Roles(Role.SUPER_ADMIN)
@RequireFeature("isCashCollectionEnabled")
@Controller("cash-collections")
export class CashCollectionsController {
  constructor(private readonly service: CashCollectionsService) {}

  @Get("balances")
  getBalances(@CurrentUser() user: JwtPayload) {
    return this.service.getBalances(user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCashCollectionDto) {
    return this.service.create(user.tenantId, user.sub, dto);
  }
}
