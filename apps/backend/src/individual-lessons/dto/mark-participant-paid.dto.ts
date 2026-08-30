import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { PaymentMethod } from "@oplata/shared";

export class MarkParticipantPaidDto {
  // Не обязательно, если fromBalance=true — тогда оплата списывается с баланса ученика.
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  fromBalance?: boolean;
}
