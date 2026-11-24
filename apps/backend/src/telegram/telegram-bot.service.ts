import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  BUTTONS,
  CONSENT_ACCEPT,
  CONSENT_DECLINE,
  CONSENT_PROMPT,
  MESSAGES,
  POLICY_VERSION,
  policyTextRo,
  policyTextRu,
} from "./consent-policy";
import { TelegramService } from "./telegram.service";

interface TgChat {
  id: number;
  type: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TgUpdate {
  message?: { message_id: number; chat: TgChat; text?: string };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: TgChat } };
}

export type ConsentStatus = "ACCEPTED" | "PENDING" | "REVOKED";

export function consentStatusOf(
  chat: { consentAcceptedAt: Date | null; consentRevokedAt: Date | null } | null | undefined,
): ConsentStatus {
  if (chat?.consentRevokedAt) return "REVOKED";
  if (chat?.consentAcceptedAt) return "ACCEPTED";
  return "PENDING";
}

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Webhook ----------

  private webhookSecret(tenantId: string): string {
    const key = this.config.get<string>("JWT_SECRET");
    if (!key) throw new Error("JWT_SECRET не задан");
    return createHmac("sha256", key).update(`telegram-webhook:${tenantId}`).digest("hex");
  }

  verifyWebhookSecret(tenantId: string, provided: string | undefined): boolean {
    if (!provided) return false;
    const expected = Buffer.from(this.webhookSecret(tenantId));
    const actual = Buffer.from(provided);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  // Регистрирует у Telegram адрес, на который он присылает сообщения боту этого центра.
  // Адрес берётся из PUBLIC_API_URL (или RENDER_EXTERNAL_URL на Render). Локально переменных нет —
  // и это намеренно: локальный запуск не должен перенаправлять рабочего бота на localhost.
  async registerWebhook(tenantId: string, botToken: string): Promise<boolean> {
    const baseUrl = this.config.get<string>("PUBLIC_API_URL") ?? this.config.get<string>("RENDER_EXTERNAL_URL");
    if (!baseUrl) {
      this.logger.log("Адрес сервера не задан (локальный запуск) — вебхук Telegram не регистрируется");
      return false;
    }
    return this.telegram.callApi(botToken, "setWebhook", {
      url: `${baseUrl.replace(/\/$/, "")}/telegram/webhook/${tenantId}`,
      secret_token: this.webhookSecret(tenantId),
      allowed_updates: ["message", "callback_query"],
    });
  }

  // ---------- Обработка сообщений бота ----------

  async handleUpdate(tenantId: string, update: TgUpdate): Promise<void> {
    const [settings, tenant] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    if (!settings?.isTelegramEnabled || !settings.telegramBotToken || !tenant) return;
    const token = settings.telegramBotToken;

    const message = update.message;
    if (message && message.chat.type === "private") {
      const chatId = String(message.chat.id);
      const chat = await this.touchChat(tenantId, message.chat);
      const command = (message.text ?? "").trim().split(/[\s@]/)[0].toLowerCase();

      if (command === "/revoke" || command === "/stop") {
        if (consentStatusOf(chat) === "ACCEPTED") {
          await this.prisma.telegramChat.update({
            where: { tenantId_chatId: { tenantId, chatId } },
            data: { consentRevokedAt: new Date() },
          });
        }
        await this.telegram.sendMessage(token, chatId, MESSAGES.revoked);
      } else if (command === "/start" && consentStatusOf(chat) === "ACCEPTED") {
        await this.telegram.sendMessage(token, chatId, MESSAGES.alreadyAccepted);
      } else if (consentStatusOf(chat) !== "ACCEPTED") {
        await this.sendConsentRequest(token, chatId, tenant.name);
      }
      return;
    }

    const query = update.callback_query;
    if (query?.message && query.message.chat.type === "private") {
      const chatId = String(query.message.chat.id);
      const data = query.data ?? "";

      if (data.startsWith("consent:accept:")) {
        await this.prisma.telegramChat.upsert({
          where: { tenantId_chatId: { tenantId, chatId } },
          create: {
            tenantId,
            chatId,
            consentVersion: data.slice("consent:accept:".length),
            consentAcceptedAt: new Date(),
          },
          update: {
            consentVersion: data.slice("consent:accept:".length),
            consentAcceptedAt: new Date(),
            consentRevokedAt: null,
          },
        });
        await this.telegram.callApi(token, "answerCallbackQuery", {
          callback_query_id: query.id,
          text: "Согласие сохранено / Acord salvat",
        });
        await this.removeKeyboard(token, chatId, query.message.message_id);
        await this.telegram.sendMessage(token, chatId, MESSAGES.accepted);
      } else if (data === CONSENT_DECLINE) {
        await this.telegram.callApi(token, "answerCallbackQuery", { callback_query_id: query.id });
        await this.removeKeyboard(token, chatId, query.message.message_id);
        await this.telegram.sendMessage(token, chatId, MESSAGES.declined);
      } else {
        await this.telegram.callApi(token, "answerCallbackQuery", { callback_query_id: query.id });
      }
    }
  }

  // Показывает политику (на русском и румынском) и кнопки «Согласен» / «Не согласен».
  async sendConsentRequest(botToken: string, chatId: string, schoolName: string): Promise<void> {
    await this.telegram.sendMessage(botToken, chatId, policyTextRu(schoolName));
    await this.telegram.sendMessage(botToken, chatId, policyTextRo(schoolName));
    await this.telegram.sendMessage(botToken, chatId, CONSENT_PROMPT, {
      reply_markup: {
        inline_keyboard: [
          [{ text: BUTTONS.accept, callback_data: CONSENT_ACCEPT }],
          [{ text: BUTTONS.decline, callback_data: CONSENT_DECLINE }],
        ],
      },
    });
  }

  private removeKeyboard(botToken: string, chatId: string, messageId: number) {
    return this.telegram.callApi(botToken, "editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  }

  private touchChat(tenantId: string, chat: TgChat) {
    const chatId = String(chat.id);
    const profile = { firstName: chat.first_name ?? null, lastName: chat.last_name ?? null, username: chat.username ?? null };
    return this.prisma.telegramChat.upsert({
      where: { tenantId_chatId: { tenantId, chatId } },
      create: { tenantId, chatId, ...profile },
      update: { ...profile, lastMessageAt: new Date() },
    });
  }

  // ---------- Для остального приложения ----------

  // Единственный разрешённый способ написать родителю: без действующего согласия
  // на обработку персональных данных сообщение не отправляется.
  async sendToParent(tenantId: string, botToken: string, chatId: string, text: string): Promise<boolean> {
    const chat = await this.prisma.telegramChat.findUnique({ where: { tenantId_chatId: { tenantId, chatId } } });
    if (consentStatusOf(chat) !== "ACCEPTED") {
      this.logger.warn("Сообщение родителю не отправлено: нет действующего согласия на обработку данных");
      return false;
    }
    return this.telegram.sendMessage(botToken, chatId, text);
  }

  // Админ просит бота запросить согласие у уже привязанного родителя.
  async requestConsent(tenantId: string, chatId: string): Promise<{ sent: boolean }> {
    const [settings, tenant] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    if (!settings?.isTelegramEnabled || !settings.telegramBotToken || !tenant) return { sent: false };

    await this.prisma.telegramChat.upsert({
      where: { tenantId_chatId: { tenantId, chatId } },
      create: { tenantId, chatId },
      update: {},
    });
    await this.sendConsentRequest(settings.telegramBotToken, chatId, tenant.name);
    return { sent: true };
  }

  async listChats(tenantId: string) {
    const chats = await this.prisma.telegramChat.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    return chats.map((chat) => ({
      chatId: chat.chatId,
      name: [chat.firstName, chat.lastName].filter(Boolean).join(" ") || `Чат ${chat.chatId}`,
      username: chat.username,
      consentStatus: consentStatusOf(chat),
      consentAcceptedAt: chat.consentAcceptedAt,
    }));
  }

  async getConsentStatuses(tenantId: string, chatIds: string[]): Promise<Map<string, ConsentStatus>> {
    const chats = chatIds.length
      ? await this.prisma.telegramChat.findMany({ where: { tenantId, chatId: { in: chatIds } } })
      : [];
    return new Map(chats.map((chat) => [chat.chatId, consentStatusOf(chat)]));
  }

  get policyVersion() {
    return POLICY_VERSION;
  }
}
