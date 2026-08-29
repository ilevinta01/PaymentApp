import { IsNumber, Min } from "class-validator";

export class UpdateFeaturePriceDto {
  @IsNumber()
  @Min(0)
  price: number;
}
