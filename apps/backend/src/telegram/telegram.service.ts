import { BadRequestException, Injectable, Logger } from "@nestjs/common";

export interface TelegramChatOption {
  chatId: string;
  name: string;
  username: string | null;
  lastMessage: string | null;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  // Best-effort: сбой отправки не должен ломать фиксацию оплаты, поэтому исключения гасятся здесь.
  async sendMessage(botToken: string, chatId: string, text: string): Promise<void> {
    this.logger.log(`Отправка сообщения в Telegram, chatId=${chatId}`);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Telegram API вернул ошибку ${response.status}: ${body}`);
      } else {
        this.logger.log(`Сообщение в Telegram доставлено, chatId=${chatId}`);
      }
    } catch (error) {
      this.logger.warn(`Не удалось отправить сообщение в Telegram: ${(error as Error).message}`);
    }
  }

  // Родителю нужно один раз написать боту, чтобы Telegram разрешил боту писать ему первым.
  // getUpdates отдаёт последние такие сообщения — из них собираем список чатов на выбор,
  // чтобы Супер-Админу не пришлось искать числовой chat_id вручную.
  async getRecentChats(botToken: string): Promise<TelegramChatOption[]> {
    let response: Response;
    try {
      response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
    } catch (error) {
      throw new BadRequestException(`Не удалось связаться с Telegram: ${(error as Error).message}`);
    }

    if (!response.ok) {
      throw new BadRequestException("Неверный токен бота или Telegram API недоступен");
    }

    const body = (await response.json()) as {
      ok: boolean;
      result?: Array<{
        message?: {
          date: number;
          text?: string;
          chat: { id: number; type: string; first_name?: string; last_name?: string; username?: string };
        };
      }>;
    };

    if (!body.ok) throw new BadRequestException("Неверный токен бота");

    const chatsById = new Map<string, TelegramChatOption & { date: number }>();
    for (const update of body.result ?? []) {
      const chat = update.message?.chat;
      if (!chat || chat.type !== "private") continue;

      const chatId = String(chat.id);
      const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || `Чат ${chatId}`;
      const existing = chatsById.get(chatId);
      const date = update.message!.date;

      if (!existing || existing.date < date) {
        chatsById.set(chatId, {
          chatId,
          name,
          username: chat.username ?? null,
          lastMessage: update.message?.text ?? null,
          date,
        });
      }
    }

    return Array.from(chatsById.values())
      .sort((a, b) => b.date - a.date)
      .map(({ date: _date, ...chat }) => chat);
  }
}
