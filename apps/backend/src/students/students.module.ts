import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [TelegramModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
