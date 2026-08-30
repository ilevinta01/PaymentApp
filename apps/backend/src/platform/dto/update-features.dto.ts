import { IsBoolean, IsOptional } from "class-validator";

export class UpdateFeaturesDto {
  @IsOptional()
  @IsBoolean()
  isCardEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isTelegramEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isCashCollectionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isTeacherEarningsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isIndividualLessonsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isScheduleEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaymentsReportEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDebtorsReportEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isIndividualDebtorsReportEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isChangeLogEnabled?: boolean;
}
