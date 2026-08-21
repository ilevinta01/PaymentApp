import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString()
  fullName!: string;

  @IsString()
  groupId!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  parentFullName?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsString()
  parentTelegramChatId?: string;
}
