import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { clientIp } from "../common/client-ip";

const RATE_LIMIT_KEY = "rateLimit";

/** Ограничение числа запросов с одного IP на маршрут: @RateLimit(10, 60) — не больше 10 за 60 секунд. */
export const RateLimit = (limit: number, windowSeconds: number) => SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds });

// Простой счётчик в памяти сервера. Для одного экземпляра на Render этого достаточно;
// при нескольких экземплярах лимит считался бы отдельно на каждом.
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {
    setInterval(() => this.hits.clear(), 60 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const cfg = this.reflector.get<{ limit: number; windowSeconds: number } | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!cfg) return true;

    const req = context.switchToHttp().getRequest();
    const key = `${clientIp(req)}|${req.method}|${req.route?.path ?? req.url}`;
    const now = Date.now();
    const windowMs = cfg.windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= cfg.limit) {
      throw new HttpException("Слишком много попыток. Подождите немного и повторите.", HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
