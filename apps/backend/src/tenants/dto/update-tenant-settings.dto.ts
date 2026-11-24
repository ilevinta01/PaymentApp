import { IsHexColor, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @IsOptional()
  @IsHexColor()
  individualLessonColor?: string;

  // Срок хранения данных учеников в годах; null выключает автоматическое обезличивание.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  retentionYears?: number | null;
}
