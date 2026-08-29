import { WeeklyScheduleDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getWeeklySchedule(params?: { weekStart?: string; teacherId?: string }): Promise<WeeklyScheduleDto> {
  const { data } = await apiClient.get<WeeklyScheduleDto>("/schedule", { params });
  return data;
}
