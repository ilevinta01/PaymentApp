import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenantSettings, updateTenantSettings, uploadTenantLogo } from "../../api/tenantSettings";

const DEFAULT_COLOR = "#4f46e5";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const [token, setToken] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setToken(data?.telegramBotToken ?? "");
  }, [data?.telegramBotToken]);

  useEffect(() => {
    setColor(data?.primaryColor ?? DEFAULT_COLOR);
  }, [data?.primaryColor]);

  const colorMutation = useMutation({
    mutationFn: (primaryColor: string) => updateTenantSettings({ primaryColor }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadTenantLogo(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

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
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Фирменный стиль</h2>
        <div className="space-y-3 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Основной цвет</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={() => colorMutation.mutate(color)}
                className="h-9 w-9 cursor-pointer rounded border border-slate-300 p-0"
              />
              <span className="text-sm text-slate-500">{color}</span>
            </div>
          </div>
          {colorMutation.isSuccess && <p className="text-sm text-emerald-600">Цвет сохранён.</p>}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-3">
              {data?.logoUrl ? (
                <img src={data.logoUrl} alt="Логотип" className="h-10 max-w-[120px] object-contain" />
              ) : (
                <span className="text-sm text-slate-400">Логотип не загружен</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoMutation.isPending}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              {logoMutation.isPending ? "Загрузка…" : "Загрузить логотип"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) logoMutation.mutate(file);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-slate-400">PNG, JPEG, WebP или SVG, до 1 МБ.</p>
        </div>
      </div>

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
            className="rounded-lg bg-[var(--brand-primary)] text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            Сохранить
          </button>
        </form>
        {tokenMutation.isSuccess && <p className="text-sm text-emerald-600">Токен сохранён.</p>}
      </div>
    </div>
  );
}
