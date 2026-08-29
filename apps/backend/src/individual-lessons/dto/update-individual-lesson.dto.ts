import { IsDateString, IsInt, IsOptional, Min } from "class-validator";

export class UpdateIndividualLessonDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;
}
