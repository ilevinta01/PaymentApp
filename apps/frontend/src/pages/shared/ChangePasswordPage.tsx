import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword, errorMessage } from "../../api/auth";
import { useAuthStore } from "../../store/auth.store";

// Смена пароля в личном кабинете (и для владельца, и для преподавателя).
export default function ChangePasswordPage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const mismatch = repeat.length > 0 && next !== repeat;

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: (data) => {
      // После смены пароля старый токен перестаёт действовать — сохраняем новый, чтобы не выбросило из кабинета.
      if (user) setAuth({ accessToken: data.accessToken, user });
      setCurrent("");
      setNext("");
      setRepeat("");
    },
  });

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Смена пароля</h2>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!mismatch) mutation.mutate();
        }}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block text-sm">
          <span className="text-slate-600">Текущий пароль</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Новый пароль (минимум 8 символов, буква и цифра)</span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Повторите новый пароль</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {mismatch && <span className="mt-1 block text-red-600">Пароли не совпадают</span>}
        </label>
        <button
          disabled={mutation.isPending || mismatch}
          className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 font-medium text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Сохраняем…" : "Изменить пароль"}
        </button>
        {mutation.isSuccess && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Пароль изменён.</p>}
        {mutation.isError && (
          <p className="text-sm text-red-600">{errorMessage(mutation.error, "Не удалось изменить пароль.")}</p>
        )}
      </form>
      <p className="text-sm text-slate-500">
        Забыли текущий пароль? Выйдите из кабинета и на экране входа нажмите «Забыли пароль» — ссылка придёт на email.
      </p>
    </div>
  );
}
