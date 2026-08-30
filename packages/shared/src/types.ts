import { PaymentMethod, Role, StudentStatus, SubscriptionStatus } from "./enums";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: Role;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    tenantId: string;
  };
}

export interface TenantSettingsDto {
  isCardEnabled: boolean;
  isTelegramEnabled: boolean;
  isCashCollectionEnabled: boolean;
  isTeacherEarningsEnabled: boolean;
  isIndividualLessonsEnabled: boolean;
  isScheduleEnabled: boolean;
  isPaymentsReportEnabled: boolean;
  isDebtorsReportEnabled: boolean;
  isIndividualDebtorsReportEnabled: boolean;
  isChangeLogEnabled: boolean;
  telegramBotToken: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  individualLessonColor: string;
}

export interface TelegramChatOptionDto {
  chatId: string;
  name: string;
  username: string | null;
  lastMessage: string | null;
}

export interface RoomDto {
  id: string;
  name: string;
  allowDoubleBooking: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
}

export interface GroupScheduleSlotDto {
  id: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId: string | null;
  roomName: string | null;
}

export interface GroupDto {
  id: string;
  name: string;
  monthlyPrice: string;
  color: string;
  scheduleSlots?: GroupScheduleSlotDto[];
  teachers?: { id: string; fullName: string }[];
}

export interface ScheduleGroupOccurrenceDto {
  groupId: string;
  groupName: string;
  groupColor: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string | null;
  roomName: string | null;
}

export type ScheduleView = "day" | "week" | "month";
export type ScheduleMode = "teacher" | "student" | "room";

export interface ScheduleDto {
  view: ScheduleView;
  rangeStart: string;
  rangeEnd: string;
  groupOccurrences: ScheduleGroupOccurrenceDto[];
  individualLessons: IndividualLessonDto[];
}

export interface StudentDto {
  id: string;
  fullName: string;
  groupId: string;
  status: StudentStatus;
  statusUntil: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  parentFullName: string | null;
  parentPhone: string | null;
  parentTelegramChatId: string | null;
  isPaidCurrentMonth?: boolean;
  group?: {
    id: string;
    name: string;
    monthlyPrice: string;
  };
}

export interface ReportSummaryDto {
  periodMonth: string;
  totalCollected: string;
  cashTotal: string;
  cardTotal: string;
  paymentsCount: number;
  studentsCount: number;
  debtorsCount: number;
}

export interface DebtorGroupDto {
  groupId: string;
  groupName: string;
  students: StudentDto[];
}

export interface GroupPaymentEntryDto {
  id: string;
  studentName: string;
  amount: string;
  paymentMethod: PaymentMethod;
  dateTime: string;
}

export interface GroupPaymentsReportDto {
  groupId: string;
  groupName: string;
  totalCollected: string;
  cashTotal: string;
  cardTotal: string;
  paymentsCount: number;
  payments: GroupPaymentEntryDto[];
}

export interface IndividualDebtorDto {
  participantId: string;
  studentId: string;
  studentName: string;
  shareAmount: string;
  lessonStartAt: string;
  subject: string | null;
}

export interface IndividualDebtorsByTeacherDto {
  teacherId: string;
  teacherName: string;
  totalOwed: string;
  debtors: IndividualDebtorDto[];
}

export type ChangeLogCategory = "PAYMENT_EDITED" | "INDIVIDUAL_PAID" | "INDIVIDUAL_CANCELLED";

export interface ChangeLogEntryDto {
  id: string;
  category: ChangeLogCategory;
  date: string;
  actorId: string;
  actorName: string;
  studentName: string;
  description: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  groupIds?: string[];
  individualLessonRate?: string | null;
  telegramChatId?: string | null;
}

export interface PaymentDto {
  id: string;
  studentId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  periodMonth: string;
  dateTime: string;
  createdBy: string;
  student?: {
    id: string;
    fullName: string;
  };
}

export interface TenantSummaryDto {
  id: string;
  name: string;
  subscriptionStatus: SubscriptionStatus;
  effectiveStatus: "ACTIVE" | "UNPAID" | "BLOCKED";
  subscriptionPaidUntil: string;
  createdAt: string;
  usersCount: number;
  studentsCount: number;
  contractFileUrl: string | null;
  contractUploadedAt: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  isCardEnabled: boolean;
  isTelegramEnabled: boolean;
  isCashCollectionEnabled: boolean;
  isTeacherEarningsEnabled: boolean;
  isIndividualLessonsEnabled: boolean;
  isScheduleEnabled: boolean;
  isPaymentsReportEnabled: boolean;
  isDebtorsReportEnabled: boolean;
  isIndividualDebtorsReportEnabled: boolean;
  isChangeLogEnabled: boolean;
  owner: { fullName: string; email: string; phone: string | null } | null;
}

export interface TeacherEarningsDto {
  teacherId: string;
  teacherName: string;
  totalAmount: string;
  groupTotal: string;
  individualTotal: string;
  groups: { groupId: string; groupName: string; amount: string }[];
  payments: {
    id: string;
    studentName: string;
    groupName: string;
    amount: string;
    paymentMethod: PaymentMethod;
    dateTime: string;
  }[];
  individualPayments: {
    studentName: string;
    amount: string;
    paymentMethod: PaymentMethod | null;
    dateTime: string | null;
    subject: string | null;
  }[];
}

export interface CashCollectionBalanceDto {
  teacherId: string;
  teacherName: string;
  balance: string;
}

export interface CashCollectionDto {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: string;
  collectedByName: string;
  collectedAt: string;
}

export interface IndividualLessonParticipantDto {
  id: string;
  studentId: string;
  studentName: string;
  shareAmount: string;
  isPaid: boolean;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
}

export interface IndividualLessonDto {
  id: string;
  teacherId: string;
  teacherName: string;
  startAt: string;
  durationMinutes: number;
  hourlyRateSnapshot: string;
  totalPrice: string;
  createdAt: string;
  roomId: string | null;
  roomName: string | null;
  subject: string | null;
  participants: IndividualLessonParticipantDto[];
  // Присутствует только в ответе на создание/изменение: не блокирующие предупреждения
  // о пересечении зала (когда у зала разрешено двойное бронирование).
  warnings?: string[];
}
