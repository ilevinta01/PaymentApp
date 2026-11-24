import { Injectable, Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";

// Отправка писем по SMTP. Настройки берутся из переменных окружения:
//   SMTP_HOST, SMTP_PORT (по умолчанию 587), SMTP_USER, SMTP_PASS, MAIL_FROM
// Если SMTP не настроен, письма не уходят: на локальном компьютере ссылка печатается в консоль
// сервера (удобно для разработки), на боевом сервере в журнал пишется только предупреждение.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    this.from = process.env.MAIL_FROM || process.env.SMTP_USER || "Оплата <no-reply@localhost>";
    if (host) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
  }

  get isConfigured() {
    return this.transporter !== null;
  }

  /** Возвращает true, если письмо принято почтовым сервером. */
  async send(to: string, subject: string, text: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      if (process.env.NODE_ENV === "production") {
        this.logger.warn(`SMTP не настроен — письмо для ${to} не отправлено (${subject})`);
      } else {
        this.logger.warn(`SMTP не настроен. Письмо для ${to}: «${subject}»\n${text}`);
      }
      return false;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (err) {
      this.logger.error(`Не удалось отправить письмо на ${to}: ${(err as Error).message}`);
      return false;
    }
  }
}
