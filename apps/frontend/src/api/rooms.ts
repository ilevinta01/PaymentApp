import { RoomDto } from "@oplata/shared";
import { apiClient } from "./client";

export async function getRooms(): Promise<RoomDto[]> {
  const { data } = await apiClient.get<RoomDto[]>("/rooms");
  return data;
}

export async function createRoom(payload: { name: string }) {
  const { data } = await apiClient.post<RoomDto>("/rooms", payload);
  return data;
}

export async function updateRoom(id: string, payload: { name?: string; allowDoubleBooking?: boolean }) {
  const { data } = await apiClient.patch<RoomDto>(`/rooms/${id}`, payload);
  return data;
}

export async function deleteRoom(id: string) {
  const { data } = await apiClient.delete(`/rooms/${id}`);
  return data;
}
