import { IsHexColor, IsOptional, IsString } from "class-validator";

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @IsOptional()
  @IsHexColor()
  individualLessonColor?: string;
}
