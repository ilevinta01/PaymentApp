import { IsBoolean, IsHexColor, IsOptional, IsString } from "class-validator";

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsBoolean()
  isCardEnabled?: boolean;

  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;
}
