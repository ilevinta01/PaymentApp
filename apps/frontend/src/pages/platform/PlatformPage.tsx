import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FEATURE_DEFINITIONS, SubscriptionStatus, TenantSummaryDto } from "@oplata/shared";
import {
  createTenant,
  downloadContract,
  getFeaturePrices,
  getTenants,
  updateFeaturePrice,
  updateSubscription,
  updateTenantBranding,
  updateTenantFeatures,
  uploadContract,
  uploadTenantLogo,
} from "../../api/platform";
import { clearPlatformKey, getPlatformKey, setPlatformKey } from "../../api/platformClient";

const DEFAULT_COLOR = "#4f46e5";

const STATUS_LABEL: Record<TenantSummaryDto["effectiveStatus"], string> = {
  ACTIVE: "Активен",
  UNPAID: "Не оплачено",
  BLOCKED: "Заблокирован",
};

const STATUS_CLASS: Record<TenantSummaryDto["effectiveStatus"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  UNPAID: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: TenantSummaryDto["effectiveStatus"] }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function TenantFeaturesPanel({ tenant, onChanged }: { tenant: TenantSummaryDto; onChanged: () => void }) {
  const { data: prices, isLoading } = useQuery({ queryKey: ["feature-prices"], queryFn: getFeaturePrices });

  const featuresMutation = useMutation({
    mutationFn: (key: (typeof FEATURE_DEFINITIONS)[number]["key"]) =>
      updateTenantFeatures(tenant.id, { [key]: !tenant[key] }),
    onSuccess: onChanged,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Загрузка…</p>;

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {prices?.map((feature) => (
        <li key={feature.key} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium text-slate-800">{feature.label}</p>
            <p className="text-sm text-slate-500">{feature.description}</p>
            <p className="text-sm text-slate-400">Стоимость: {feature.price} MDL/мес</p>
          </div>
          <input
            type="checkbox"
            checked={tenant[feature.key]}
            onChange={() => featuresMutation.mutate(feature.key)}
            disabled={featuresMutation.isPending}
            className="h-5 w-5 shrink-0"
          />
        </li>
      ))}
    </ul>
  );
}

function TenantDetailView({
  tenant,
  onChanged,
  onBack,
}: {
  tenant: TenantSummaryDto;
  onChanged: () => void;
  onBack: () => void;
}) {
  const [paidUntil, setPaidUntil] = useState(tenant.subscriptionPaidUntil.slice(0, 10));
  const [color, setColor] = useState(tenant.primaryColor ?? DEFAULT_COLOR);
  const [showFeatures, setShowFeatures] = useState(false);
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
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-medium text-[var(--brand-primary,#4f46e5)]">
        ← Ко всем школам
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">{tenant.name}</p>
          <p className="text-sm text-slate-500">
            {tenant.usersCount} сотрудник(ов) · {tenant.studentsCount} учеников
          </p>
        </div>
        <StatusBadge status={tenant.effectiveStatus} />
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

      <div>
        <button
          onClick={() => setShowFeatures((v) => !v)}
          className="w-full rounded-lg bg-slate-800 px-4 py-3 text-left font-medium text-white"
        >
          Функции системы {showFeatures ? "▲" : "▼"}
        </button>
        {showFeatures && (
          <div className="mt-2">
            <TenantFeaturesPanel tenant={tenant} onChanged={onChanged} />
          </div>
        )}
      </div>
    </div>
  );
}

function TenantListRow({ tenant, onClick }: { tenant: TenantSummaryDto; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-slate-50"
      >
        <span className="font-medium text-slate-800">{tenant.name}</span>
        <StatusBadge status={tenant.effectiveStatus} />
      </button>
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

function PricingView() {
  const queryClient = useQueryClient();
  const { data: prices, isLoading } = useQuery({ queryKey: ["feature-prices"], queryFn: getFeaturePrices });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: ({ key, price }: { key: string; price: number }) => updateFeaturePrice(key, price),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feature-prices"] }),
  });

  if (isLoading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">Стоимость функций</h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {prices?.map((feature) => {
          const draft = drafts[feature.key] ?? String(feature.price);
          return (
            <li key={feature.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{feature.label}</p>
                <p className="text-sm text-slate-500">{feature.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [feature.key]: e.target.value }))}
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-right"
                />
                <span className="text-sm text-slate-500">MDL/мес</span>
                <button
                  onClick={() => saveMutation.mutate({ key: feature.key, price: Number(draft) })}
                  disabled={saveMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Сохранить
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type View = { type: "list" } | { type: "pricing" } | { type: "tenant"; id: string };

export default function PlatformPage() {
  const queryClient = useQueryClient();
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(!!getPlatformKey());
  const [view, setView] = useState<View>({ type: "list" });

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

  const selectedTenant = view.type === "tenant" ? tenants?.find((t) => t.id === view.id) : undefined;
  const invalidateTenants = () => queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <p className="font-semibold text-slate-900">Панель владельца платформы</p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView({ type: "list" })}
            className={`text-sm font-medium ${view.type !== "pricing" ? "text-indigo-600" : "text-slate-500"}`}
          >
            Школы
          </button>
          <button
            onClick={() => setView({ type: "pricing" })}
            className={`text-sm font-medium ${view.type === "pricing" ? "text-indigo-600" : "text-slate-500"}`}
          >
            Тарифы
          </button>
          <button
            onClick={() => {
              clearPlatformKey();
              setHasKey(false);
            }}
            className="text-sm font-medium text-slate-500"
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="space-y-6 p-4">
        {view.type === "pricing" && <PricingView />}

        {view.type === "tenant" && selectedTenant && (
          <TenantDetailView
            tenant={selectedTenant}
            onChanged={invalidateTenants}
            onBack={() => setView({ type: "list" })}
          />
        )}

        {view.type === "list" && (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Подключить новый детский центр</h2>
              <CreateTenantForm onCreated={invalidateTenants} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Детские центры</h2>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {tenants?.map((tenant) => (
                  <TenantListRow key={tenant.id} tenant={tenant} onClick={() => setView({ type: "tenant", id: tenant.id })} />
                ))}
                {tenants?.length === 0 && <li className="px-4 py-3 text-slate-500">Центров пока нет</li>}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
