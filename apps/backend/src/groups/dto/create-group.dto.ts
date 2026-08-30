import { IsHexColor, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
