import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { errorMessage, setPassword } from "../api/auth";

// Страница по ссылке из письма: приглашение нового сотрудника (подтверждение email + первый пароль)
// и восстановление забытого/заблокированного пароля.
export default function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPasswordValue] = useState("");
  const [repeat, setRepeat] = useState("");

  const mutation = useMutation({ mutationFn: () => setPassword(token, password) });
  const mismatch = repeat.length > 0 && password !== repeat;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!mismatch) mutation.mutate();
        }}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Задайте пароль</h1>
          <p className="text-sm text-slate-500">
            Придумайте пароль для входа: минимум 8 символов, хотя бы одна буква и одна цифра.
          </p>
        </div>

        {!token ? (
          <p className="text-sm text-red-600">Ссылка неполная. Откройте её из письма ещё раз.</p>
        ) : mutation.isSuccess ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              Готово! Пароль сохранён, email подтверждён. Теперь можно войти.
            </p>
            <Link
              to="/login"
              className="block w-full rounded-lg bg-indigo-600 py-2 text-center font-medium text-white hover:bg-indigo-700"
            >
              Перейти ко входу
            </Link>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Новый пароль</label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Повторите пароль</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {mismatch && <p className="mt-1 text-sm text-red-600">Пароли не совпадают</p>}
            </div>
            {mutation.isError && (
              <div className="space-y-1">
                <p className="text-sm text-red-600">{errorMessage(mutation.error, "Не удалось сохранить пароль.")}</p>
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-600">
                  Запросить новую ссылку →
                </Link>
              </div>
            )}
            <button
              type="submit"
              disabled={mutation.isPending || mismatch}
              className="w-full rounded-lg bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {mutation.isPending ? "Сохраняем…" : "Сохранить пароль"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
