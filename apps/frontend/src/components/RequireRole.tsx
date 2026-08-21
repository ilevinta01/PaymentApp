import { Navigate, Outlet } from "react-router-dom";
import { Role } from "@oplata/shared";
import { useAuthStore } from "../store/auth.store";

export default function RequireRole({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/login" replace />;

  return <Outlet />;
}
