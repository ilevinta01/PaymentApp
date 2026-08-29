import { IsEnum } from "class-validator";
import { PaymentMethod } from "@oplata/shared";

export class MarkParticipantPaidDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
