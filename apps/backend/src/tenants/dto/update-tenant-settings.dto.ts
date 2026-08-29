import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsBoolean()
  isCardEnabled?: boolean;

  @IsOptional()
  @IsString()
  telegramBotToken?: string;
}
