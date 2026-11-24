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

// Бот присылает родителю политику конфиденциальности с кнопкой «Согласен».
export async function requestParentConsent(chatId: string): Promise<{ sent: boolean }> {
  const { data } = await apiClient.post<{ sent: boolean }>("/telegram/consent-request", { chatId });
  return data;
}
