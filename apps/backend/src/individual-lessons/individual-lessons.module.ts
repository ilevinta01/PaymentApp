import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { IndividualLessonsController } from "./individual-lessons.controller";
import { IndividualLessonsService } from "./individual-lessons.service";

@Module({
  imports: [TelegramModule],
  controllers: [IndividualLessonsController],
  providers: [IndividualLessonsService],
})
export class IndividualLessonsModule {}
