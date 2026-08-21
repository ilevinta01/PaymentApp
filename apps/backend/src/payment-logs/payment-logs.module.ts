import { Module } from "@nestjs/common";
import { PaymentLogsController } from "./payment-logs.controller";
import { PaymentLogsService } from "./payment-logs.service";

@Module({
  controllers: [PaymentLogsController],
  providers: [PaymentLogsService],
})
export class PaymentLogsModule {}
