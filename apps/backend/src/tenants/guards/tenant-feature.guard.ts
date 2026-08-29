import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureKey, JwtPayload } from "@oplata/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { FEATURE_KEY } from "../decorators/require-feature.decorator";

// Позволяет владельцу платформы продавать функции по отдельности: если у тенанта функция
// не подключена, соответствующий эндпоинт недоступен, даже если роль пользователя подходит.
@Injectable()
export class TenantFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureKey | undefined>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return false;

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
    if (!settings?.[feature]) {
      throw new ForbiddenException("Эта функция не подключена для вашего центра. Обратитесь к владельцу платформы.");
    }
    return true;
  }
}
