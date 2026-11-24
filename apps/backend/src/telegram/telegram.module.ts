import { Module } from "@nestjs/common";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramBotService],
  exports: [TelegramService, TelegramBotService],
})
export class TelegramModule {}
