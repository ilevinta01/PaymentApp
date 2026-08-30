import { IndividualLessonDto, IndividualLessonParticipantDto, PaymentMethod } from "@oplata/shared";
import { apiClient } from "./client";

export async function getIndividualLessons(): Promise<IndividualLessonDto[]> {
  const { data } = await apiClient.get<IndividualLessonDto[]>("/individual-lessons");
  return data;
}

export async function getIndividualLessonsForStudent(
  studentId: string,
): Promise<(IndividualLessonParticipantDto & { individualLesson: IndividualLessonDto })[]> {
  const { data } = await apiClient.get(`/individual-lessons/by-student/${studentId}`);
  return data;
}

export async function createIndividualLesson(payload: {
  teacherId?: string;
  studentIds: string[];
  startAt: string;
  durationMinutes: number;
  roomId?: string;
  subject?: string;
}): Promise<IndividualLessonDto> {
  const { data } = await apiClient.post<IndividualLessonDto>("/individual-lessons", payload);
  return data;
}

export async function markIndividualLessonParticipantPaid(participantId: string, paymentMethod: PaymentMethod) {
  const { data } = await apiClient.post(`/individual-lessons/participants/${participantId}/pay`, { paymentMethod });
  return data;
}

export async function updateIndividualLesson(
  lessonId: string,
  payload: { startAt?: string; durationMinutes?: number; roomId?: string; subject?: string },
): Promise<IndividualLessonDto> {
  const { data } = await apiClient.patch<IndividualLessonDto>(`/individual-lessons/${lessonId}`, payload);
  return data;
}
