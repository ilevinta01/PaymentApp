import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GroupDto } from "@oplata/shared";
import { addScheduleSlot, removeScheduleSlot, updateScheduleSlot } from "../api/groups";
import { getRooms } from "../api/rooms";

const DAY_LABELS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
// Отображаем неделю с понедельника — привычнее для восприятия, чем начиная с воскресенья,
// хотя внутри dayOfWeek хранится по конвенции JS Date.getDay() (0 = вс).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface DayState {
  checked: boolean;
  startTime: string;
  endTime: string;
  roomId: string;
  slotId?: string;
}

function buildInitialState(group: GroupDto): Record<number, DayState> {
  const state: Record<number, DayState> = {};
  for (let day = 0; day < 7; day++) {
    const slot = group.scheduleSlots?.find((s) => s.dayOfWeek === day);
    state[day] = slot
      ? { checked: true, startTime: slot.startTime, endTime: slot.endTime, roomId: slot.roomId ?? "", slotId: slot.id }
      : { checked: false, startTime: "15:00", endTime: "16:00", roomId: "" };
  }
  return state;
}

export default function GroupScheduleEditor({ group, onChanged }: { group: GroupDto; onChanged: () => void }) {
  const [days, setDays] = useState<Record<number, DayState>>(() => buildInitialState(group));
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });

  useEffect(() => {
    setDays(buildInitialState(group));
  }, [group.id, group.scheduleSlots]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jobs = DISPLAY_ORDER.map(async (day) => {
        const state = days[day];
        if (state.checked && !state.slotId) {
          await addScheduleSlot(group.id, {
            dayOfWeek: day,
            startTime: state.startTime,
            endTime: state.endTime,
            roomId: state.roomId || undefined,
          });
        } else if (state.checked && state.slotId) {
          await updateScheduleSlot(state.slotId, {
            startTime: state.startTime,
            endTime: state.endTime,
            roomId: state.roomId,
          });
        } else if (!state.checked && state.slotId) {
          await removeScheduleSlot(state.slotId);
        }
      });
      await Promise.all(jobs);
    },
    onSuccess: onChanged,
  });

  const setDay = (day: number, patch: Partial<DayState>) => {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">Расписание группы</p>
      <ul className="space-y-2">
        {DISPLAY_ORDER.map((day) => {
          const state = days[day];
          return (
            <li key={day} className="space-y-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={state.checked}
                  onChange={(e) => setDay(day, { checked: e.target.checked })}
                  className="h-4 w-4"
                />
                {DAY_LABELS[day]}
              </label>
              {state.checked && (
                <div className="ml-6 flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={state.startTime}
                    onChange={(e) => setDay(day, { startTime: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    value={state.endTime}
                    onChange={(e) => setDay(day, { endTime: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  {rooms && rooms.length > 0 && (
                    <select
                      value={state.roomId}
                      onChange={(e) => setDay(day, { roomId: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600"
                    >
                      <option value="">Без зала</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {saveMutation.isPending ? "Сохраняем…" : "Сохранить расписание"}
      </button>
      {saveMutation.isError && <p className="text-sm text-red-600">Не удалось сохранить расписание.</p>}
      {saveMutation.isSuccess && <p className="text-sm text-emerald-600">Расписание сохранено.</p>}
    </div>
  );
}
