import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const isHome = location.pathname === "/admin";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {!isHome && (
            <Link to="/admin" aria-label="На главную" className="text-xl leading-none text-indigo-600">
              ←
            </Link>
          )}
          <div>
            <p className="font-semibold text-slate-900">Панель Владельца</p>
            <p className="text-sm text-slate-500">{user?.fullName}</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm font-medium text-indigo-600">
          Выйти
        </button>
      </header>
      <main className="mx-auto max-w-lg p-4">
        <Outlet />
      </main>
    </div>
  );
}
