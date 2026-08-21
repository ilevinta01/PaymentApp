import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@oplata/shared";

export class CreatePaymentDto {
  @IsString()
  studentId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  // Обязательна только для Супер-Админа — у Преподавателя сумма всегда фиксируется по цене группы.
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  // Необязательное указание расчётного месяца (доступно только Супер-Админу), по умолчанию — текущий месяц.
  @IsOptional()
  @IsString()
  periodMonth?: string;
}
