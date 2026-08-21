import { GroupDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getGroups(): Promise<GroupDto[]> {
  const { data } = await apiClient.get<GroupDto[]>("/groups");
  return data;
}

export async function createGroup(payload: { name: string; monthlyPrice: number }) {
  const { data } = await apiClient.post<GroupDto>("/groups", payload);
  return data;
}

export async function updateGroup(id: string, payload: { name?: string; monthlyPrice?: number }) {
  const { data } = await apiClient.patch<GroupDto>(`/groups/${id}`, payload);
  return data;
}
