import { Navigate, Route, Routes } from "react-router-dom";
import { Role } from "@oplata/shared";
import OfflineBanner from "./components/OfflineBanner";
import LoginPage from "./pages/LoginPage";
import RequireRole from "./components/RequireRole";
import AdminLayout from "./layouts/AdminLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import AdminHomePage from "./pages/admin/HomePage";
import TeacherHomePage from "./pages/teacher/HomePage";
import GroupsListPage from "./pages/shared/GroupsListPage";
import GroupDetailPage from "./pages/shared/GroupDetailPage";
import StudentDetailPage from "./pages/shared/StudentDetailPage";
import SearchStudentPage from "./pages/shared/SearchStudentPage";
import IndividualLessonsPage from "./pages/shared/IndividualLessonsPage";
import SchedulePage from "./pages/shared/SchedulePage";
import AddStudentPage from "./pages/admin/AddStudentPage";
import ReportsPage from "./pages/admin/ReportsPage";
import TeacherEarningsPage from "./pages/admin/TeacherEarningsPage";
import CashCollectionsPage from "./pages/admin/CashCollectionsPage";
import StaffPage from "./pages/admin/StaffPage";
import SettingsPage from "./pages/admin/SettingsPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import DebtorsPage from "./pages/admin/DebtorsPage";
import PaymentLogsPage from "./pages/admin/PaymentLogsPage";
import PlatformPage from "./pages/platform/PlatformPage";

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/platform" element={<PlatformPage />} />

        <Route element={<RequireRole allow={[Role.SUPER_ADMIN]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="groups/:groupId" element={<GroupDetailPage />} />
            <Route path="groups" element={<GroupsListPage />} />
            <Route path="students/new" element={<AddStudentPage />} />
            <Route path="students/:studentId" element={<StudentDetailPage />} />
            <Route path="search" element={<SearchStudentPage />} />
            <Route path="individual-lessons" element={<IndividualLessonsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/payments" element={<PaymentsPage />} />
            <Route path="reports/debtors" element={<DebtorsPage />} />
            <Route path="reports/payment-logs" element={<PaymentLogsPage />} />
            <Route path="reports/teacher-earnings" element={<TeacherEarningsPage />} />
            <Route path="reports/cash-collections" element={<CashCollectionsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole allow={[Role.TEACHER]} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<TeacherHomePage />} />
            <Route path="groups/:groupId" element={<GroupDetailPage />} />
            <Route path="groups" element={<GroupsListPage />} />
            <Route path="students/:studentId" element={<StudentDetailPage />} />
            <Route path="search" element={<SearchStudentPage />} />
            <Route path="individual-lessons" element={<IndividualLessonsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
