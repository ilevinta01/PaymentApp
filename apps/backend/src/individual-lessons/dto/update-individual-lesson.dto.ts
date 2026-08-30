import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateIndividualLessonDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  // Пустая строка означает "убрать зал".
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
