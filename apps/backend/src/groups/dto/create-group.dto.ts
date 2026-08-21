import { IsNumber, IsString, Min } from "class-validator";

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  monthlyPrice!: number;
}
