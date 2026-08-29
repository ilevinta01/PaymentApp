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
  telegramBotToken: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
}

export interface TelegramChatOptionDto {
  chatId: string;
  name: string;
  username: string | null;
  lastMessage: string | null;
}

export interface GroupDto {
  id: string;
  name: string;
  monthlyPrice: string;
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

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  groupIds?: string[];
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
  subscriptionPaidUntil: string;
  createdAt: string;
  usersCount: number;
  studentsCount: number;
  contractFileUrl: string | null;
  contractUploadedAt: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  owner: { fullName: string; email: string; phone: string | null } | null;
}

export interface TeacherEarningsDto {
  teacherId: string;
  teacherName: string;
  totalAmount: string;
  payments: {
    id: string;
    studentName: string;
    amount: string;
    paymentMethod: PaymentMethod;
    dateTime: string;
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

export interface PaymentLogDto {
  id: string;
  paymentId: string;
  editDate: string;
  oldAmount: string;
  newAmount: string;
  oldMethod: PaymentMethod;
  newMethod: PaymentMethod;
  reason: string;
  editedBy: { id: string; fullName: string };
  student: { id: string; fullName: string };
}
