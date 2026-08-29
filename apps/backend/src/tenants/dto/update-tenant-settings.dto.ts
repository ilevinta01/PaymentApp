import { IsOptional, IsString } from "class-validator";

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  telegramBotToken?: string;
}
