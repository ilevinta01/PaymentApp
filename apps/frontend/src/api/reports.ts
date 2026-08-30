import {
  ChangeLogEntryDto,
  GroupPaymentsReportDto,
  IndividualDebtorsByTeacherDto,
  ReportSummaryDto,
  TeacherEarningsDto,
} from "@oplata/shared";
import { apiClient } from "./client";

export async function getReportSummary(periodMonth?: string): Promise<ReportSummaryDto> {
  const { data } = await apiClient.get<ReportSummaryDto>("/reports/summary", { params: { periodMonth } });
  return data;
}

export async function getPaymentsByGroup(periodMonth?: string): Promise<GroupPaymentsReportDto[]> {
  const { data } = await apiClient.get<GroupPaymentsReportDto[]>("/reports/payments-by-group", {
    params: { periodMonth },
  });
  return data;
}

export async function exportPaymentsByGroup(periodMonth?: string, groupId?: string): Promise<Blob> {
  const { data } = await apiClient.get("/reports/payments-by-group/export", {
    params: { periodMonth, groupId },
    responseType: "blob",
  });
  return data;
}

export async function getIndividualDebtors(): Promise<IndividualDebtorsByTeacherDto[]> {
  const { data } = await apiClient.get<IndividualDebtorsByTeacherDto[]>("/reports/individual-debtors");
  return data;
}

export async function getChangeLog(params?: { category?: string; actorId?: string }): Promise<ChangeLogEntryDto[]> {
  const { data } = await apiClient.get<ChangeLogEntryDto[]>("/reports/change-log", { params });
  return data;
}

export async function getTeacherEarnings(periodMonth?: string): Promise<TeacherEarningsDto[]> {
  const { data } = await apiClient.get<TeacherEarningsDto[]>("/reports/teacher-earnings", {
    params: { periodMonth },
  });
  return data;
}
