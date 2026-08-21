import { Module } from "@nestjs/common";
import { DebtorsController } from "./debtors.controller";
import { DebtorsCronService } from "./debtors-cron.service";
import { DebtorsService } from "./debtors.service";

@Module({
  controllers: [DebtorsController],
  providers: [DebtorsService, DebtorsCronService],
  exports: [DebtorsService],
})
export class DebtorsModule {}
