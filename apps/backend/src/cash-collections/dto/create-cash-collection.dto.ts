import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCashCollectionDto {
  @IsString()
  teacherId!: string;

  // Если не указано — изымается весь текущий баланс преподавателя.
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
