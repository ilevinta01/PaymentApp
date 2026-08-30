import { StudentDto, StudentStatus } from "@oplata/shared";
import { apiClient } from "./client";

export async function getStudents(params?: { groupId?: string; search?: string }): Promise<StudentDto[]> {
  const { data } = await apiClient.get<StudentDto[]>("/students", { params });
  return data;
}

export async function getStudent(id: string): Promise<StudentDto> {
  const { data } = await apiClient.get<StudentDto>(`/students/${id}`);
  return data;
}

export interface StudentProfilePayload {
  fullName?: string;
  groupId?: string;
  dateOfBirth?: string;
  phone?: string;
  parentFullName?: string;
  parentPhone?: string;
  parentTelegramChatId?: string;
}

export async function createStudent(payload: StudentProfilePayload & { fullName: string; groupId: string }) {
  const { data } = await apiClient.post<StudentDto>("/students", payload);
  return data;
}

export async function updateStudent(id: string, payload: StudentProfilePayload) {
  const { data } = await apiClient.patch<StudentDto>(`/students/${id}`, payload);
  return data;
}

export async function updateStudentStatus(id: string, payload: { status: StudentStatus; statusUntil?: string }) {
  const { data } = await apiClient.patch<StudentDto>(`/students/${id}/status`, payload);
  return data;
}

export async function deleteStudent(id: string) {
  const { data } = await apiClient.delete(`/students/${id}`);
  return data;
}
