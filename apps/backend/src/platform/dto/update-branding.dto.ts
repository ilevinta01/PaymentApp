import { IsHexColor } from "class-validator";

export class UpdateBrandingDto {
  @IsHexColor()
  primaryColor: string;
}
