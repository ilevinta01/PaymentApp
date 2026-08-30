import { ScheduleDto, ScheduleMode, ScheduleView } from "@oplata/shared";
import { apiClient } from "./client";

export async function getSchedule(params: {
  view: ScheduleView;
  mode: ScheduleMode;
  date?: string;
  targetId?: string;
}): Promise<ScheduleDto> {
  const { data } = await apiClient.get<ScheduleDto>("/schedule", { params });
  return data;
}
