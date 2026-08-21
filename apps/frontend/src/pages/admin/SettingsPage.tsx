import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenantSettings, updateTenantSettings } from "../../api/tenantSettings";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(data?.telegramBotToken ?? "");
  }, [data?.telegramBotToken]);

  const cardMutation = useMutation({
    mutationFn: (isCardEnabled: boolean) => updateTenantSettings({ isCardEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  const tokenMutation = useMutation({
    mutationFn: () => updateTenantSettings({ telegramBotToken: token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  if (isLoading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Настройки способов оплаты</h2>
        <label className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-4">
          <input
            type="checkbox"
            checked={data?.isCardEnabled ?? false}
            onChange={(e) => cardMutation.mutate(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-slate-700">
            Разрешить оплату картой / безналичный расчёт (по умолчанию доступны только наличные)
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Telegram-бот для чеков</h2>
        <p className="text-sm text-slate-500">
          Токен вашего бота — родители получат автоматический чек с суммой и способом оплаты.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            tokenMutation.mutate();
          }}
          className="flex gap-2 bg-white border border-slate-200 rounded-lg p-4"
        >
          <input
            placeholder="123456:AAAA-ваш-токен-бота"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            disabled={tokenMutation.isPending}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            Сохранить
          </button>
        </form>
        {tokenMutation.isSuccess && <p className="text-sm text-emerald-600">Токен сохранён.</p>}
      </div>
    </div>
  );
}
