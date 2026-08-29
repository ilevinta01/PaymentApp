import { Role, UserDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getStaff(): Promise<UserDto[]> {
  const { data } = await apiClient.get<UserDto[]>("/users");
  return data;
}

export interface StaffPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: Role;
  groupIds?: string[];
}

export async function createStaff(payload: StaffPayload) {
  const { data } = await apiClient.post<UserDto>("/users", payload);
  return data;
}

export async function updateStaff(
  id: string,
  payload: {
    fullName?: string;
    phone?: string;
    groupIds?: string[];
    individualLessonRate?: number;
    telegramChatId?: string;
  },
) {
  const { data } = await apiClient.patch<UserDto>(`/users/${id}`, payload);
  return data;
}

export async function setStaffActive(id: string, isActive: boolean) {
  const { data } = await apiClient.patch<UserDto>(`/users/${id}/active`, { isActive });
  return data;
}
