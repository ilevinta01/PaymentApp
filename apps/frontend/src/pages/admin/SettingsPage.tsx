import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoomDto } from "@oplata/shared";
import { getTenantSettings, updateTenantSettings } from "../../api/tenantSettings";
import { createRoom, deleteRoom, getRooms, updateRoom } from "../../api/rooms";

function RoomRow({ room, onChanged }: { room: RoomDto; onChanged: () => void }) {
  const [start, setStart] = useState(room.workingHoursStart);
  const [end, setEnd] = useState(room.workingHoursEnd);

  const hoursMutation = useMutation({
    mutationFn: () => updateRoom(room.id, { workingHoursStart: start, workingHoursEnd: end }),
    onSuccess: onChanged,
  });

  const toggleMutation = useMutation({
    mutationFn: (allowDoubleBooking: boolean) => updateRoom(room.id, { allowDoubleBooking }),
    onSuccess: onChanged,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoom(room.id),
    onSuccess: onChanged,
  });

  const hoursChanged = start !== room.workingHoursStart || end !== room.workingHoursEnd;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-slate-800">{room.name}</span>
        <button
          onClick={() => {
            if (confirm(`Удалить зал «${room.name}»?`)) deleteMutation.mutate();
          }}
          className="text-sm font-medium text-red-600"
        >
          Удалить
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>Часы работы:</span>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1"
        />
        <span className="text-slate-400">–</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1"
        />
        {hoursChanged && (
          <button
            onClick={() => hoursMutation.mutate()}
            disabled={hoursMutation.isPending}
            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
          >
            Сохранить
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={room.allowDoubleBooking}
          onChange={(e) => toggleMutation.mutate(e.target.checked)}
          className="h-4 w-4"
        />
        Разрешить двойное бронирование
      </label>
    </li>
  );
}

function RoomsSection() {
  const queryClient = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("21:00");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rooms"] });

  const createMutation = useMutation({
    mutationFn: () => createRoom({ name, workingHoursStart: start, workingHoursEnd: end }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">Залы / классы</h2>
      <p className="text-sm text-slate-500">
        Часы работы зала используются как границы сетки в расписании. Если у зала выключено «Разрешить двойное
        бронирование», при пересечении с другим занятием система не даст создать запись — иначе будет показано
        лишь предупреждение, решение остаётся за пользователем.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate();
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          placeholder="Название зала"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2"
        />
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2"
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
          <RoomRow key={room.id} room={room} onChanged={invalidate} />
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
  const [lessonColor, setLessonColor] = useState("#f59e0b");

  useEffect(() => {
    setToken(data?.telegramBotToken ?? "");
  }, [data?.telegramBotToken]);

  useEffect(() => {
    if (data?.individualLessonColor) setLessonColor(data.individualLessonColor);
  }, [data?.individualLessonColor]);

  const tokenMutation = useMutation({
    mutationFn: () => updateTenantSettings({ telegramBotToken: token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });

  const lessonColorMutation = useMutation({
    mutationFn: () => updateTenantSettings({ individualLessonColor: lessonColor }),
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

      {data?.isIndividualLessonsEnabled && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Цвет индивидуальных занятий</h2>
          <p className="text-sm text-slate-500">
            Единый цвет для всех индивидуальных занятий в расписании — у каждой группы свой цвет задаётся на
            странице самой группы.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={lessonColor}
              onChange={(e) => setLessonColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <button
              onClick={() => lessonColorMutation.mutate()}
              disabled={lessonColorMutation.isPending || lessonColor === data?.individualLessonColor}
              className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {data?.isScheduleEnabled && <RoomsSection />}
    </div>
  );
}
