import { ReportSummaryDto, TeacherEarningsDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getReportSummary(periodMonth?: string): Promise<ReportSummaryDto> {
  const { data } = await apiClient.get<ReportSummaryDto>("/reports/summary", { params: { periodMonth } });
  return data;
}

export async function getTeacherEarnings(periodMonth?: string): Promise<TeacherEarningsDto[]> {
  const { data } = await apiClient.get<TeacherEarningsDto[]>("/reports/teacher-earnings", {
    params: { periodMonth },
  });
  return data;
}
