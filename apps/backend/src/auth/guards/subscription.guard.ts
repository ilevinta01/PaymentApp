import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtPayload, SubscriptionStatus } from "@oplata/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Блокирует доступ, если детский центр (тенант) не оплатил подписку за текущий месяц.
// Согласно ТЗ п.1.2: блокировка наступает с 1-го числа неоплаченного периода.
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return false;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) throw new ForbiddenException("Детский центр не найден");

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const isPaidForCurrentMonth = tenant.subscriptionPaidUntil >= firstDayOfMonth;

    if (tenant.subscriptionStatus === SubscriptionStatus.BLOCKED || !isPaidForCurrentMonth) {
      throw new ForbiddenException(
        "Подписка детского центра не оплачена за текущий месяц. Доступ заблокирован до оплаты.",
      );
    }

    return true;
  }
}
