import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SubscriptionStatus, TenantSummaryDto } from "@oplata/shared";
import {
  createTenant,
  downloadContract,
  getTenants,
  updateSubscription,
  updateTenantBranding,
  updateTenantFeatures,
  uploadContract,
  uploadTenantLogo,
} from "../../api/platform";
import { clearPlatformKey, getPlatformKey, setPlatformKey } from "../../api/platformClient";

const DEFAULT_COLOR = "#4f46e5";

const FEATURE_LIST: { key: "isCardEnabled" | "isTelegramEnabled" | "isCashCollectionEnabled" | "isTeacherEarningsEnabled"; label: string }[] = [
  { key: "isCardEnabled", label: "Оплата картой" },
  { key: "isTelegramEnabled", label: "Telegram-чеки" },
  { key: "isCashCollectionEnabled", label: "Касса (инкассация)" },
  { key: "isTeacherEarningsEnabled", label: "Отчёт по заработку" },
];

function TenantRow({ tenant, onChanged }: { tenant: TenantSummaryDto; onChanged: () => void }) {
  const [paidUntil, setPaidUntil] = useState(tenant.subscriptionPaidUntil.slice(0, 10));
  const [color, setColor] = useState(tenant.primaryColor ?? DEFAULT_COLOR);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const dateMutation = useMutation({
    mutationFn: () => updateSubscription(tenant.id, { subscriptionPaidUntil: paidUntil }),
    onSuccess: onChanged,
  });

  const colorMutation = useMutation({
    mutationFn: () => updateTenantBranding(tenant.id, color),
    onSuccess: onChanged,
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadTenantLogo(tenant.id, file),
    onSuccess: onChanged,
  });

  const featuresMutation = useMutation({
    mutationFn: (key: (typeof FEATURE_LIST)[number]["key"]) => updateTenantFeatures(tenant.id, { [key]: !tenant[key] }),
    onSuccess: onChanged,
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      updateSubscription(tenant.id, {
        subscriptionStatus:
          tenant.subscriptionStatus === SubscriptionStatus.ACTIVE
            ? SubscriptionStatus.BLOCKED
            : SubscriptionStatus.ACTIVE,
      }),
    onSuccess: onChanged,
  });

  const contractMutation = useMutation({
    mutationFn: (file: File) => uploadContract(tenant.id, file),
    onSuccess: onChanged,
  });

  const isBlocked = tenant.subscriptionStatus === SubscriptionStatus.BLOCKED;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-800">{tenant.name}</p>
          <p className="text-sm text-slate-500">
            {tenant.usersCount} сотрудник(ов) · {tenant.studentsCount} учеников
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            isBlocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isBlocked ? "Блокирован" : "Активен"}
        </span>
      </div>

      {tenant.owner && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p>Владелец: {tenant.owner.fullName}</p>
          <p>
            {tenant.owner.email}
            {tenant.owner.phone ? ` · ${tenant.owner.phone}` : ""}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-600">Оплачено до:</label>
        <input
          type="date"
          value={paidUntil}
          onChange={(e) => setPaidUntil(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={() => dateMutation.mutate()}
          disabled={dateMutation.isPending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Сохранить дату
        </button>
        <button
          onClick={() => statusMutation.mutate()}
          disabled={statusMutation.isPending}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            isBlocked ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700"
          }`}
        >
          {isBlocked ? "Разблокировать" : "Заблокировать"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">
          Контракт: {tenant.contractFileUrl ? "загружен" : "не загружен"}
        </span>
        {tenant.contractFileUrl && (
          <button
            onClick={() => downloadContract(tenant.id, tenant.name)}
            className="text-sm font-medium text-indigo-600"
          >
            Скачать
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) contractMutation.mutate(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={contractMutation.isPending}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 disabled:opacity-60"
        >
          {contractMutation.isPending ? "Загружаем…" : "Загрузить копию контракта"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-sm text-slate-600">Фирменный стиль:</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onBlur={() => colorMutation.mutate()}
            className="h-8 w-8 cursor-pointer rounded border border-slate-300 p-0"
          />
          <span className="text-sm text-slate-500">{color}</span>
        </div>
        {colorMutation.isSuccess && <span className="text-sm text-emerald-600">Цвет сохранён</span>}

        <div className="flex items-center gap-2">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt="Логотип" className="h-8 max-w-[100px] object-contain" />
          ) : (
            <span className="text-sm text-slate-400">Логотип не загружен</span>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) logoMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoMutation.isPending}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 disabled:opacity-60"
          >
            {logoMutation.isPending ? "Загружаем…" : "Загрузить логотип"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-sm text-slate-600">Тариф (подключённые функции):</span>
        {FEATURE_LIST.map((feature) => (
          <label key={feature.key} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={tenant[feature.key]}
              onChange={() => featuresMutation.mutate(feature.key)}
              disabled={featuresMutation.isPending}
              className="h-4 w-4"
            />
            {feature.label}
          </label>
        ))}
      </div>
    </li>
  );
}

function CreateTenantForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createTenant({
        name,
        superAdminEmail: email,
        superAdminPassword: password,
        superAdminFullName: fullName,
        superAdminPhone: phone || undefined,
      }),
    onSuccess: () => {
      onCreated();
      setName("");
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4"
    >
      <input
        placeholder="Название центра"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
      />
      <input
        placeholder="ФИО владельца"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
      />
      <input
        placeholder="Email владельца"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
      />
      <input
        placeholder="Телефон владельца"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
      />
      <input
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="w-40 rounded-lg border border-slate-300 px-3 py-2"
      />
      <button
        disabled={mutation.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {mutation.isPending ? "Создаём…" : "Подключить центр"}
      </button>
      {mutation.isError && (
        <p className="w-full text-sm text-red-600">Не удалось создать центр. Проверьте данные.</p>
      )}
    </form>
  );
}

export default function PlatformPage() {
  const queryClient = useQueryClient();
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(!!getPlatformKey());

  const { data: tenants, isError } = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: getTenants,
    enabled: hasKey,
    retry: false,
  });

  useEffect(() => {
    if (isError && hasKey) {
      clearPlatformKey();
      setHasKey(false);
    }
  }, [isError, hasKey]);

  if (!hasKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPlatformKey(keyInput);
            setHasKey(true);
          }}
          className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow"
        >
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Панель платформы</h1>
            <p className="text-sm text-slate-500">Введите ключ доступа владельца платформы</p>
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <button className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white">Войти</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <p className="font-semibold text-slate-900">Панель владельца платформы</p>
        <button
          onClick={() => {
            clearPlatformKey();
            setHasKey(false);
          }}
          className="text-sm font-medium text-indigo-600"
        >
          Выйти
        </button>
      </header>
      <main className="space-y-6 p-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Подключить новый детский центр</h2>
          <CreateTenantForm onCreated={() => queryClient.invalidateQueries({ queryKey: ["platform-tenants"] })} />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Детские центры</h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {tenants?.map((tenant) => (
              <TenantRow
                key={tenant.id}
                tenant={tenant}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["platform-tenants"] })}
              />
            ))}
            {tenants?.length === 0 && <li className="px-4 py-3 text-slate-500">Центров пока нет</li>}
          </ul>
        </div>
      </main>
    </div>
  );
}
