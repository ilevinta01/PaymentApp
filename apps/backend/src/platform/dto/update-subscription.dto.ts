import { IsDateString, IsEnum, IsOptional } from "class-validator";
import { SubscriptionStatus } from "@oplata/shared";

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  subscriptionPaidUntil?: string;
}
