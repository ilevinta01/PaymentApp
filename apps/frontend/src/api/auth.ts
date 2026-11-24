import { isAxiosError } from "axios";
import { AuthResponse } from "@oplata/shared";
import { apiClient } from "./client";

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post("/auth/forgot-password", { email });
  return data;
}

export async function setPassword(token: string, password: string): Promise<{ email: string }> {
  const { data } = await apiClient.post<{ email: string }>("/auth/set-password", { token, password });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
}

/** Достаёт понятное сообщение об ошибке из ответа сервера (он пишет по-русски). */
export function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === "string") return message;
    if (error.response?.status === 429) return "Слишком много попыток. Подождите немного и повторите.";
  }
  return fallback;
}

export function errorCode(error: unknown): string | undefined {
  return isAxiosError(error) ? error.response?.data?.code : undefined;
}
