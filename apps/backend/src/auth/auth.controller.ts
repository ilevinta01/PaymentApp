import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { JwtPayload } from "@oplata/shared";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto, ForgotPasswordDto, SetPasswordDto } from "./dto/password.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { RateLimit, RateLimitGuard } from "./rate-limit.guard";

@UseGuards(RateLimitGuard)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit(15, 60)
  @HttpCode(200)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // Ответ всегда одинаковый — не раскрываем, есть ли такой email в системе.
  @Public()
  @RateLimit(5, 600)
  @HttpCode(200)
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { ok: true };
  }

  // Установка пароля по ссылке из письма: и для приглашения нового сотрудника, и для восстановления.
  @Public()
  @RateLimit(10, 600)
  @HttpCode(200)
  @Post("set-password")
  setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto.token, dto.password);
  }

  @RateLimit(10, 600)
  @HttpCode(200)
  @Post("change-password")
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }
}
