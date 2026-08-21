import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query("periodMonth") periodMonth?: string) {
    return this.service.findAll(user.tenantId, periodMonth);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.service.create(user.tenantId, user, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.update(user.tenantId, user.sub, id, dto);
  }
}
