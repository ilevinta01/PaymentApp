import { Module } from "@nestjs/common";
import { CashCollectionsController } from "./cash-collections.controller";
import { CashCollectionsService } from "./cash-collections.service";

@Module({
  controllers: [CashCollectionsController],
  providers: [CashCollectionsService],
})
export class CashCollectionsModule {}
