import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { RetentionService } from "./retention.service";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [TelegramModule],
  controllers: [StudentsController],
  providers: [StudentsService, RetentionService],
})
export class StudentsModule {}
