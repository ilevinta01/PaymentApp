import { randomBytes } from "crypto";
import * as bcrypt from "bcrypt";

// Аккаунт, созданный по приглашению, получает случайный пароль, который никто не знает.
// Настоящий пароль человек задаёт сам по ссылке из письма (заодно подтверждая свой email).
export function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("hex"), 10);
}
