import { AuthResponse } from "@oplata/shared";
import { apiClient } from "./client";

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return data;
}
