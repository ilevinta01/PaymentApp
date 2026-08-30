import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@oplata/shared";

export class CreatePaymentDto {
  @IsString()
  studentId!: string;

  // Не обязателен, если fromBalance=true — тогда оплата списывается с баланса (аванса) ученика.
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  fromBalance?: boolean;

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
