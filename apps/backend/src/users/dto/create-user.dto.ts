import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "@oplata/shared";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];
}
