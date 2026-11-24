import { createHash, randomBytes } from "crypto";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthResponse, JwtPayload, Role } from "@oplata/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { inviteEmail, resetEmail } from "../mail/mail-templates";

export const MAX_FAILED_ATTEMPTS = 3;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
// Не чаще одного письма одного типа в минуту на аккаунт — защита от «заспамливания» почты человека.
const RESEND_COOLDOWN_MS = 60 * 1000;

type TokenType = "INVITE" | "RESET";

// Хэш-пустышка: сравниваем с ним, когда email не найден (одинаковое время ответа).
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
  }

  private appUrl() {
    return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
  }

  private async signFor(user: { id: string; tenantId: string; role: string; email: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as Role,
      email: user.email,
    };
    return this.jwt.signAsync(payload);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.findByEmail(email);
    // Для несуществующего аккаунта тоже считаем хэш, чтобы по времени ответа нельзя было угадать,
    // есть ли такой email в системе.
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new UnauthorizedException("Неверный email или пароль");
    }
    if (!user.isActive) throw new UnauthorizedException("Неверный email или пароль");

    if (user.lockedAt) {
      throw new HttpException(
        { statusCode: 423, code: "ACCOUNT_LOCKED", message: "Аккаунт заблокирован после 3 неверных попыток. Восстановите пароль через email." },
        423,
      );
    }
    if (!user.emailVerifiedAt) {
      throw new HttpException(
        { statusCode: 403, code: "EMAIL_NOT_VERIFIED", message: "Email не подтверждён. Откройте письмо-приглашение или нажмите «Забыли пароль»." },
        403,
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        await this.prisma.user.update({ where: { id: user.id }, data: { lockedAt: new Date() } });
        // Сразу отправляем письмо со ссылкой на восстановление — владелец аккаунта не останется без доступа.
        await this.sendAccessLink(user.id).catch(() => undefined);
        throw new HttpException(
          { statusCode: 423, code: "ACCOUNT_LOCKED", message: "Аккаунт заблокирован после 3 неверных попыток. Мы отправили письмо со ссылкой для восстановления пароля." },
          423,
        );
      }
      const left = MAX_FAILED_ATTEMPTS - updated.failedLoginAttempts;
      throw new HttpException(
        { statusCode: 401, code: "BAD_CREDENTIALS", message: `Неверный email или пароль. Осталось попыток: ${left}.`, attemptsLeft: left },
        401,
      );
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
    }

    return {
      accessToken: await this.signFor(user),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as Role,
        tenantId: user.tenantId,
      },
    };
  }

  /** Создаёт одноразовый токен (старые токены этого типа аннулируются) и возвращает его «сырое» значение. */
  private async issueToken(userId: string, type: TokenType): Promise<string> {
    const raw = randomBytes(32).toString("hex");
    await this.prisma.$transaction([
      this.prisma.authToken.deleteMany({ where: { userId, type } }),
      this.prisma.authToken.create({
        data: {
          userId,
          type,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + (type === "INVITE" ? INVITE_TTL_MS : RESET_TTL_MS)),
        },
      }),
    ]);
    return raw;
  }

  /**
   * Отправляет человеку письмо со ссылкой: приглашение (если email ещё не подтверждён)
   * или восстановление пароля. Возвращает true, если письмо ушло.
   * `force` отключает ограничение «не чаще раза в минуту» (для первого письма при создании аккаунта).
   */
  async sendAccessLink(userId: string, force = false): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return false;

    const type: TokenType = user.emailVerifiedAt ? "RESET" : "INVITE";
    if (!force) {
      const last = await this.prisma.authToken.findFirst({ where: { userId, type }, orderBy: { createdAt: "desc" } });
      if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) return false;
    }

    const token = await this.issueToken(userId, type);
    const link = `${this.appUrl()}/set-password?token=${token}`;
    const msg =
      type === "INVITE" ? inviteEmail(user.fullName, link) : resetEmail(user.fullName, link, !!user.lockedAt);
    return this.mail.send(user.email, msg.subject, msg.text, msg.html);
  }

  /** «Забыли пароль»: всегда отвечает одинаково, чтобы нельзя было проверить, зарегистрирован ли email. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user || !user.isActive) return;
    await this.sendAccessLink(user.id).catch((e) => this.logger.error(e));
  }

  /** Установка пароля по ссылке из письма (и для приглашения, и для восстановления). */
  async setPassword(token: string, password: string): Promise<{ email: string }> {
    const record = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
      throw new BadRequestException("Ссылка недействительна или устарела. Запросите новую.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          emailVerifiedAt: record.user.emailVerifiedAt ?? now,
          failedLoginAttempts: 0,
          lockedAt: null,
          passwordChangedAt: now,
        },
      }),
      // Все ссылки этого человека после смены пароля больше не нужны.
      this.prisma.authToken.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { email: record.user.email };
  }

  /** Смена пароля в кабинете: нужно ввести текущий. Возвращает новый токен входа (старые перестают действовать). */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        await this.prisma.user.update({ where: { id: userId }, data: { lockedAt: new Date() } });
        await this.sendAccessLink(userId).catch(() => undefined);
        throw new ForbiddenException("Аккаунт заблокирован после 3 неверных попыток. Мы отправили письмо для восстановления пароля.");
      }
      throw new BadRequestException(
        `Текущий пароль неверный. Осталось попыток: ${MAX_FAILED_ATTEMPTS - updated.failedLoginAttempts}.`,
      );
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException("Новый пароль должен отличаться от текущего");
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        passwordChangedAt: now,
        failedLoginAttempts: 0,
      },
    });
    return { accessToken: await this.signFor(user) };
  }
}
