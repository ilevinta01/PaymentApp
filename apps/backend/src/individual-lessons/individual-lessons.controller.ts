import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireFeature } from "../tenants/decorators/require-feature.decorator";
import { CreateIndividualLessonDto } from "./dto/create-individual-lesson.dto";
import { MarkParticipantPaidDto } from "./dto/mark-participant-paid.dto";
import { UpdateIndividualLessonDto } from "./dto/update-individual-lesson.dto";
import { IndividualLessonsService } from "./individual-lessons.service";

@RequireFeature("isIndividualLessonsEnabled")
@Roles(Role.SUPER_ADMIN, Role.TEACHER)
@Controller("individual-lessons")
export class IndividualLessonsController {
  constructor(private readonly service: IndividualLessonsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId, user);
  }

  @Get("by-student/:studentId")
  findForStudent(@CurrentUser() user: JwtPayload, @Param("studentId") studentId: string) {
    return this.service.findForStudent(user.tenantId, studentId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateIndividualLessonDto) {
    return this.service.create(user.tenantId, user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateIndividualLessonDto) {
    return this.service.update(user.tenantId, user, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.remove(user.tenantId, user, id);
  }

  @Post("participants/:participantId/pay")
  markPaid(
    @CurrentUser() user: JwtPayload,
    @Param("participantId") participantId: string,
    @Body() dto: MarkParticipantPaidDto,
  ) {
    return this.service.markParticipantPaid(user.tenantId, user, participantId, dto);
  }
}
