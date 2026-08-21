import { CashCollectionBalanceDto, CashCollectionDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getCashBalances(): Promise<CashCollectionBalanceDto[]> {
  const { data } = await apiClient.get<CashCollectionBalanceDto[]>("/cash-collections/balances");
  return data;
}

export async function getCashCollections(): Promise<CashCollectionDto[]> {
  const { data } = await apiClient.get<CashCollectionDto[]>("/cash-collections");
  return data;
}

export async function createCashCollection(payload: { teacherId: string; amount?: number }) {
  const { data } = await apiClient.post<CashCollectionDto>("/cash-collections", payload);
  return data;
}
