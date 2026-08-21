import { PaymentDto, PaymentMethod } from "@oplata/shared";
import { apiClient } from "./client";

export async function getPayments(periodMonth?: string): Promise<PaymentDto[]> {
  const { data } = await apiClient.get<PaymentDto[]>("/payments", { params: periodMonth ? { periodMonth } : {} });
  return data;
}

export async function createPayment(payload: { studentId: string; paymentMethod: PaymentMethod; amount?: number }) {
  const { data } = await apiClient.post<PaymentDto>("/payments", payload);
  return data;
}

export async function updatePayment(
  id: string,
  payload: { amount?: number; paymentMethod?: PaymentMethod; reason: string },
) {
  const { data } = await apiClient.patch<PaymentDto>(`/payments/${id}`, payload);
  return data;
}
