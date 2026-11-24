import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

// Требования к новому паролю: минимум 8 символов, хотя бы одна буква и одна цифра.
const PASSWORD_MESSAGE = "Пароль: минимум 8 символов, хотя бы одна буква и одна цифра";
const TOO_LONG = "Пароль слишком длинный (максимум 72 символа)";

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class SetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @MaxLength(72, { message: TOO_LONG })
  @Matches(/\p{L}/u, { message: PASSWORD_MESSAGE })
  @Matches(/\d/, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @MaxLength(72, { message: TOO_LONG })
  @Matches(/\p{L}/u, { message: PASSWORD_MESSAGE })
  @Matches(/\d/, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
