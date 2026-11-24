import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
} from "@nestjs/common";
import { IsString } from "class-validator";
import { JwtPayload, Role } from "@oplata/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { TelegramBotService, TgUpdate } from "./telegram-bot.service";

class RequestConsentDto {
  @IsString()
  chatId!: string;
}

@Controller("telegram")
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly bot: TelegramBotService) {}

  // Сюда Telegram присылает сообщения боту центра. Доступ защищён секретным заголовком,
  // который мы сами задаём при регистрации вебхука — без него запрос отклоняется.
  @Public()
  @Post("webhook/:tenantId")
  @HttpCode(200)
  async webhook(
    @Param("tenantId") tenantId: string,
    @Headers("x-telegram-bot-api-secret-token") secret: string | undefined,
    @Body() update: TgUpdate,
  ) {
    if (!this.bot.verifyWebhookSecret(tenantId, secret)) throw new ForbiddenException();

    // Telegram повторяет доставку, если ответ не 200, поэтому внутренние ошибки только логируем.
    try {
      await this.bot.handleUpdate(tenantId, update);
    } catch (error) {
      this.logger.error(`Ошибка обработки сообщения бота: ${(error as Error).message}`);
    }
    return { ok: true };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post("consent-request")
  requestConsent(@CurrentUser() user: JwtPayload, @Body() dto: RequestConsentDto) {
    return this.bot.requestConsent(user.tenantId, dto.chatId);
  }
}
