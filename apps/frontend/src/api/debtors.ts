import { DebtorGroupDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getDebtors(): Promise<DebtorGroupDto[]> {
  const { data } = await apiClient.get<DebtorGroupDto[]>("/debtors");
  return data;
}
