import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "@oplata/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET") ?? "change_me_in_production",
    });
  }

  // Токен перестаёт действовать сразу, как только сотрудника деактивировали или заблокировали,
  // либо после смены/восстановления пароля (токены, выданные раньше, недействительны).
  async validate(payload: JwtPayload & { iat?: number }): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, lockedAt: true, passwordChangedAt: true },
    });
    if (!user || !user.isActive || user.lockedAt) throw new UnauthorizedException();
    if (user.passwordChangedAt && (payload.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
