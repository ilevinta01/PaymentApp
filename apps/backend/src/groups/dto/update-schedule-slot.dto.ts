import { IsOptional, IsString, Matches } from "class-validator";

export class UpdateScheduleSlotDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;

  // Пустая строка означает "убрать зал".
  @IsOptional()
  @IsString()
  roomId?: string;
}
