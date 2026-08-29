import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  individualLessonRate?: number;

  @IsOptional()
  @IsString()
  telegramChatId?: string;
}
