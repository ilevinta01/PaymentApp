import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@oplata/shared";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

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
