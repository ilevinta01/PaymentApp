import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateStudentDto } from "./dto/create-student.dto";
import { DepositBalanceDto } from "./dto/deposit-balance.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpdateStudentStatusDto } from "./dto/update-student-status.dto";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("search") search?: string,
    @Query("groupId") groupId?: string,
  ) {
    return this.service.findAllForUser(user.tenantId, user, { search, groupId });
  }

  @Get(":id")
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.findOne(user.tenantId, id, user);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudentDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateStudentDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(":id/status")
  updateStatus(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateStudentStatusDto) {
    return this.service.updateStatus(user.tenantId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.remove(user.tenantId, id);
  }

  // Только Супер-Админ: сумма аванса произвольная (не привязана к фиксированной цене группы,
  // как обычный платёж преподавателя), поэтому доверять её ввод преподавателю нельзя —
  // тот же принцип, что и с произвольной суммой в обычной оплате (CreatePaymentDto.amount).
  @Roles(Role.SUPER_ADMIN)
  @Post(":id/balance/deposit")
  depositBalance(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: DepositBalanceDto) {
    return this.service.depositBalance(user.tenantId, user, id, dto);
  }

  @Get(":id/balance/transactions")
  getBalanceTransactions(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.getBalanceTransactions(user.tenantId, id);
  }
}
