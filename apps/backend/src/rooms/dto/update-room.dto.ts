import { IsBoolean, IsOptional, IsString, Matches, MinLength } from "class-validator";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  allowDoubleBooking?: boolean;

  @IsOptional()
  @Matches(TIME_REGEX)
  workingHoursStart?: string;

  @IsOptional()
  @Matches(TIME_REGEX)
  workingHoursEnd?: string;
}
