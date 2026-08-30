import { IsArray, IsString } from "class-validator";

export class SetGroupTeachersDto {
  @IsArray()
  @IsString({ each: true })
  teacherIds: string[];
}
