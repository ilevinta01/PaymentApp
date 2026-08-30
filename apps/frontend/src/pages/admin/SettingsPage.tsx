import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenantSettings, updateTenantSettings } from "../../api/tenantSettings";
import { createRoom, deleteRoom, getRooms, updateRoom } from "../../api/rooms";

function RoomsSection() {
  const queryClient = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const [name, setName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rooms"] });

  const createMutation = useMutation({
    mutationFn: () => createRoom({ name }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, allowDoubleBooking }: { id: string; allowDoubleBooking: boolean }) =>
      updateRoom(id, { allowDoubleBooking }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">Залы / классы</h2>
      <p className="text-sm text-slate-500">
        Если у зала выключено «Разрешить двойное бронирование», при пересечении с другим занятием в этом зале
        система не даст создать запись. Иначе будет показано лишь предупреждение — решение остаётся за пользователем.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate();
        }}
        className="flex gap-2"
      >
        <input
          placeholder="Название зала"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          disabled={createMutation.isPending || !name.trim()}
          className="rounded-lg bg-[var(--brand-primary)] text-white px-4 py-2 font-medium disabled:opacity-60"
        >
          Добавить
        </button>
      </form>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rooms?.map((room) => (
          <li key={room.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="font-medium text-slate-800">{room.name}</span>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={room.allowDoubleBooking}
                onChange={(e) => toggleMutation.mutate({ id: room.id, allowDoubleBooking: e.target.checked })}
                className="h-4 w-4"
              />
              Разрешить двойное бронирование
            </label>
            <button
              onClick={() => {
                if (confirm(`Удалить зал «${room.name}»?`)) deleteMutation.mutate(room.id);
              }}
              className="text-sm font-medium text-red-600"
            >
              Удалить
            </button>
          </li>
        ))}
        {rooms?.length === 0 && <li className="px-4 py-4 text-slate-500">Залы ещё не добавлены</li>}
      </ul>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(data?.telegramBotToken ?? "");
  }, [data?.telegramBotToken]);

  const tokenMutation = useMutation({
    mutationFn: () => updateTenantSettings({ telegramBotToken: token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  if (isLoading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Оплата картой</h2>
        {data?.isCardEnabled ? (
          <p className="rounded-lg bg-white border border-slate-200 p-4 text-slate-700">
            Подключена — родители могут оплачивать безналичным способом.
          </p>
        ) : (
          <p className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
            Не подключена. Чтобы включить оплату картой, обратитесь к владельцу платформы.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Telegram-бот для чеков</h2>
        {data?.isTelegramEnabled ? (
          <>
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
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
            Не подключена. Чтобы включить отправку чеков в Telegram, обратитесь к владельцу платформы.
          </p>
        )}
      </div>

      {data?.isScheduleEnabled && <RoomsSection />}
    </div>
  );
}
