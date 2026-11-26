import { timingSafeEqual } from "crypto";
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { clientIp } from "../../common/client-ip";

const MAX_FAILURES = 5;
const BLOCK_WINDOW_MS = 15 * 60 * 1000;

// Владелец платформы стоит вне мультитенантной ролевой модели (он не сотрудник ни одного
// детского центра), поэтому защищается отдельным статическим ключом, а не тенантным JWT.
// Чтобы ключ нельзя было подобрать, после 5 неверных попыток с одного адреса доступ закрывается на 15 минут.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  private readonly failures = new Map<string, { count: number; since: number }>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = clientIp(request);
    const now = Date.now();

    const record = this.failures.get(ip);
    if (record && now - record.since > BLOCK_WINDOW_MS) this.failures.delete(ip);
    const current = this.failures.get(ip);
    if (current && current.count >= MAX_FAILURES) {
      throw new HttpException(
        "Слишком много неверных попыток. Подождите 15 минут и повторите.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const provided = String(request.headers["x-platform-key"] ?? "");
    const expected = this.config.get<string>("PLATFORM_ADMIN_KEY") ?? "";
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    const valid = expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);

    if (!valid) {
      this.failures.set(ip, { count: (current?.count ?? 0) + 1, since: current?.since ?? now });
      throw new UnauthorizedException("Неверный ключ доступа платформы");
    }
    this.failures.delete(ip);
    return true;
  }
}
