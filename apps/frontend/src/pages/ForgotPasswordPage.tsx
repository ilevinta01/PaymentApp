import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { errorMessage, forgotPassword } from "../api/auth";

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");

  const mutation = useMutation({ mutationFn: () => forgotPassword(email) });

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
          <h1 className="text-xl font-semibold text-slate-900">Восстановление пароля</h1>
          <p className="text-sm text-slate-500">
            Введите email аккаунта — мы отправим на него ссылку, по которой можно задать новый пароль.
          </p>
        </div>

        {mutation.isSuccess ? (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Если такой аккаунт есть, письмо со ссылкой уже отправлено. Проверьте почту (и папку «Спам»). Ссылка
            действует 1 час.
          </p>
        ) : (
          <>
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
            {mutation.isError && (
              <p className="text-sm text-red-600">{errorMessage(mutation.error, "Не удалось отправить письмо.")}</p>
            )}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-lg bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {mutation.isPending ? "Отправляем…" : "Отправить ссылку"}
            </button>
          </>
        )}
        <div className="text-center">
          <Link to="/login" className="text-sm text-slate-500 hover:text-indigo-600">
            ← Вернуться ко входу
          </Link>
        </div>
      </form>
    </div>
  );
}
