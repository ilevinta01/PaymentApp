import { IsEnum, IsISO8601, IsOptional } from "class-validator";
import { StudentStatus } from "@oplata/shared";

export class UpdateStudentStatusDto {
  @IsEnum(StudentStatus)
  status!: StudentStatus;

  @IsOptional()
  @IsISO8601()
  statusUntil?: string;
}
