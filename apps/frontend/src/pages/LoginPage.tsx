import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Role } from "@oplata/shared";
import { errorCode, errorMessage, login } from "../api/auth";
import { useAuthStore } from "../store/auth.store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setAuth(data);
      navigate(data.user.role === Role.SUPER_ADMIN ? "/admin" : "/teacher");
    },
  });

  const code = errorCode(mutation.error);
  const needsRecovery = code === "ACCOUNT_LOCKED" || code === "EMAIL_NOT_VERIFIED";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Оплата</h1>
          <p className="text-sm text-slate-500">Учёт платежей детского центра</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {mutation.isError && (
          <div className="space-y-1">
            <p className="text-sm text-red-600">
              {errorMessage(mutation.error, "Не удалось войти. Проверьте email и пароль.")}
            </p>
            {needsRecovery && (
              <Link
                to={`/forgot-password?email=${encodeURIComponent(email)}`}
                className="text-sm font-medium text-indigo-600"
              >
                Восстановить пароль по email →
              </Link>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {mutation.isPending ? "Входим…" : "Войти"}
        </button>
        <div className="text-center">
          <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-indigo-600">
            Забыли пароль?
          </Link>
        </div>
      </form>
    </div>
  );
}
