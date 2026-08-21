import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Владелец платформы стоит вне мультитенантной ролевой модели (он не сотрудник ни одного
// детского центра), поэтому защищается отдельным статическим ключом, а не тенантным JWT.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers["x-platform-key"];
    const expectedKey = this.config.get<string>("PLATFORM_ADMIN_KEY");

    if (!expectedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException("Неверный ключ доступа платформы");
    }
    return true;
  }
}
