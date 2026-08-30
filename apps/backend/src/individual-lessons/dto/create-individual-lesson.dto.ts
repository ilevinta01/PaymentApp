import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateIndividualLessonDto {
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds: string[];

  @IsDateString()
  startAt: string;

  @IsInt()
  @Min(5)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  roomId?: string;
}
