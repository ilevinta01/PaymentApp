import { TelegramChatOptionDto, TenantSettingsDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getTenantSettings(): Promise<TenantSettingsDto> {
  const { data } = await apiClient.get<TenantSettingsDto>("/tenant-settings");
  return data;
}

export async function updateTenantSettings(payload: Partial<TenantSettingsDto>): Promise<TenantSettingsDto> {
  const { data } = await apiClient.patch<TenantSettingsDto>("/tenant-settings", payload);
  return data;
}

export async function getTelegramChats(): Promise<TelegramChatOptionDto[]> {
  const { data } = await apiClient.get<TelegramChatOptionDto[]>("/tenant-settings/telegram-chats");
  return data;
}

export async function uploadTenantLogo(file: File): Promise<TenantSettingsDto> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<TenantSettingsDto>("/tenant-settings/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
