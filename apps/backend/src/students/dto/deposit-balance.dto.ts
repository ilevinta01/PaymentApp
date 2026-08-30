import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@oplata/shared";

export class DepositBalanceDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
