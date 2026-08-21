import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import { PaymentMethod } from "@oplata/shared";

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsString()
  @MinLength(3)
  reason!: string;
}
