import { SubscriptionStatus, TenantSummaryDto } from "@oplata/shared";
import { platformClient } from "./platformClient";

export async function getTenants(): Promise<TenantSummaryDto[]> {
  const { data } = await platformClient.get<TenantSummaryDto[]>("/platform/tenants");
  return data;
}

export async function createTenant(payload: {
  name: string;
  superAdminEmail: string;
  superAdminPassword: string;
  superAdminFullName: string;
  superAdminPhone?: string;
}) {
  const { data } = await platformClient.post("/platform/tenants", payload);
  return data;
}

export async function updateSubscription(
  tenantId: string,
  payload: { subscriptionStatus?: SubscriptionStatus; subscriptionPaidUntil?: string },
) {
  const { data } = await platformClient.patch(`/platform/tenants/${tenantId}/subscription`, payload);
  return data;
}

export async function uploadContract(tenantId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await platformClient.post(`/platform/tenants/${tenantId}/contract`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Скачивание требует заголовок x-platform-key, поэтому обычная <a href> ссылка не подходит —
// грузим файл через тот же авторизованный клиент и открываем как Blob.
export async function downloadContract(tenantId: string, tenantName: string): Promise<void> {
  const response = await platformClient.get(`/platform/tenants/${tenantId}/contract`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `contract-${tenantName}`;
  link.click();
  window.URL.revokeObjectURL(url);
}
