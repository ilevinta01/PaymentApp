import { StudentDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getDebtors(): Promise<StudentDto[]> {
  const { data } = await apiClient.get<StudentDto[]>("/debtors");
  return data;
}
