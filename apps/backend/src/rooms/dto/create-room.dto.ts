import { IsOptional, IsString, Matches, MinLength } from "class-validator";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @Matches(TIME_REGEX)
  workingHoursStart?: string;

  @IsOptional()
  @Matches(TIME_REGEX)
  workingHoursEnd?: string;
}
