import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateTenantDto {
  @IsString()
  name!: string;

  @IsEmail()
  superAdminEmail!: string;

  @IsString()
  @MinLength(6)
  superAdminPassword!: string;

  @IsString()
  superAdminFullName!: string;

  @IsOptional()
  @IsString()
  superAdminPhone?: string;
}
