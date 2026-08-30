import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  allowDoubleBooking?: boolean;
}
