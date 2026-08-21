import { Role } from "@oplata/shared";
import { useAuthStore } from "../store/auth.store";

// Групповые/ученические экраны переиспользуются и Супер-Админом, и Преподавателем —
// этот хук даёт корректный корень пути (/admin или /teacher) для построения ссылок.
export function useBasePath(): string {
  const role = useAuthStore((s) => s.user?.role);
  return role === Role.TEACHER ? "/teacher" : "/admin";
}
