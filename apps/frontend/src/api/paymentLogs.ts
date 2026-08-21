import { PaymentLogDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getPaymentLogs(): Promise<PaymentLogDto[]> {
  const { data } = await apiClient.get<PaymentLogDto[]>("/payment-logs");
  return data;
}
