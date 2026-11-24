import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  // Best-effort: сбой отправки не должен ломать фиксацию оплаты, поэтому исключения гасятся здесь.
  // Родителям уведомления нужно слать через TelegramBotService.sendToParent — он проверяет согласие.
  async sendMessage(
    botToken: string,
    chatId: string,
    text: string,
    extra: Record<string, unknown> = {},
  ): Promise<boolean> {
    const result = await this.callApi(botToken, "sendMessage", { chat_id: chatId, text, ...extra });
    if (result) this.logger.log("Сообщение в Telegram доставлено");
    return result;
  }

  // Универсальный вызов метода Bot API. Возвращает true при успехе, ошибки только логирует.
  async callApi(botToken: string, method: string, body: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Telegram API (${method}) вернул ошибку ${response.status}: ${text}`);
        return false;
      }
      return true;
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause?.code;
      this.logger.warn(
        `Не удалось вызвать Telegram API (${method}): ${(error as Error).message}${cause ? ` [${cause}]` : ""}`,
      );
      return false;
    }
  }
}
