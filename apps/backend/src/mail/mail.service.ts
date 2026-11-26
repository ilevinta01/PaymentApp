import { Injectable, Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";

// Отправка писем. Два способа, выбирается по переменным окружения:
//
//  1) Brevo по HTTPS-API (BREVO_API_KEY) — для боевого сервера. Бесплатный тариф Render закрывает
//     исходящие SMTP-порты, поэтому на Render письма можно слать только по HTTPS.
//  2) Обычный SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) — удобно на локальном компьютере.
//
// MAIL_FROM — адрес отправителя, формат «Оплата <адрес@почта>»; в Brevo этот адрес должен быть
// подтверждён в разделе Senders.
// Если ничего не настроено, письма не уходят: локально ссылка печатается в консоль сервера,
// на боевом сервере в журнал пишется только предупреждение.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly brevoKey: string | undefined;
  private readonly relayUrl: string | undefined;
  private readonly relaySecret: string | undefined;

  constructor() {
    this.brevoKey = process.env.BREVO_API_KEY || undefined;
    this.relayUrl = process.env.MAIL_RELAY_URL || undefined;
    this.relaySecret = process.env.MAIL_RELAY_SECRET || undefined;
    const host = process.env.SMTP_HOST;
    this.from = process.env.MAIL_FROM || process.env.SMTP_USER || "Оплата <no-reply@localhost>";
    if (!this.brevoKey && !this.relayUrl && host) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        // Не держим запрос минутами, если сервер недоступен.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        // Только для локального компьютера, где антивирус подменяет сертификаты (ошибка
        // «self-signed certificate in certificate chain»). На боевом сервере не включать.
        ...(process.env.SMTP_TLS_INSECURE === "true" ? { tls: { rejectUnauthorized: false } } : {}),
      });
    }
  }

  get isConfigured() {
    return this.transporter !== null || !!this.brevoKey || !!this.relayUrl;
  }

  private parseFrom(): { name?: string; email: string } {
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(this.from);
    return m ? { name: m[1] || undefined, email: m[2] } : { email: this.from.trim() };
  }

  /** Возвращает true, если письмо принято почтовым сервисом. */
  async send(to: string, subject: string, text: string, html: string): Promise<boolean> {
    // Скрипт Google Apps Script, привязанный к ящику отправителя (см. файл «Скрипт отправки почты»).
    if (this.relayUrl) {
      try {
        const res = await fetch(this.relayUrl, {
          method: "POST",
          headers: { "content-type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ secret: this.relaySecret, to, subject, text, html }),
          redirect: "follow",
          signal: AbortSignal.timeout(20_000),
        });
        const body = (await res.text()).slice(0, 300);
        if (!res.ok || !body.includes('"ok":true')) {
          this.logger.error(`Почтовый скрипт отклонил письмо для ${to}: HTTP ${res.status} ${body}`);
          return false;
        }
        return true;
      } catch (err) {
        this.logger.error(`Не удалось отправить письмо на ${to} через скрипт Google: ${(err as Error).message}`);
        return false;
      }
    }

    if (this.brevoKey) {
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": this.brevoKey, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: this.parseFrom(),
            to: [{ email: to }],
            subject,
            textContent: text,
            htmlContent: html,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          this.logger.error(`Brevo отклонил письмо для ${to}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
          return false;
        }
        return true;
      } catch (err) {
        this.logger.error(`Не удалось отправить письмо на ${to} через Brevo: ${(err as Error).message}`);
        return false;
      }
    }

    if (!this.transporter) {
      if (process.env.NODE_ENV === "production") {
        this.logger.warn(`Почта не настроена — письмо для ${to} не отправлено (${subject})`);
      } else {
        this.logger.warn(`Почта не настроена. Письмо для ${to}: «${subject}»\n${text}`);
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
