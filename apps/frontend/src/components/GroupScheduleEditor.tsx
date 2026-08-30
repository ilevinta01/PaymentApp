import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GroupDto } from "@oplata/shared";
import { addScheduleSlot, removeScheduleSlot } from "../api/groups";

const DAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function GroupScheduleEditor({ group, onChanged }: { group: GroupDto; onChanged: () => void }) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("16:00");

  const addMutation = useMutation({
    mutationFn: () => addScheduleSlot(group.id, { dayOfWeek, startTime, endTime }),
    onSuccess: onChanged,
  });

  const removeMutation = useMutation({
    mutationFn: (slotId: string) => removeScheduleSlot(slotId),
    onSuccess: onChanged,
  });

  const slots = [...(group.scheduleSlots ?? [])].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">Расписание группы</p>
      <ul className="space-y-1">
        {slots.map((slot) => (
          <li key={slot.id} className="flex items-center justify-between text-sm text-slate-600">
            <span>
              {DAY_LABELS[slot.dayOfWeek]} {slot.startTime}–{slot.endTime}
            </span>
            <button
              onClick={() => removeMutation.mutate(slot.id)}
              disabled={removeMutation.isPending}
              className="text-red-600"
            >
              Удалить
            </button>
          </li>
        ))}
        {slots.length === 0 && <li className="text-sm text-slate-400">Расписание не задано</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending}
          className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Добавить
        </button>
      </div>
      {addMutation.isError && <p className="text-sm text-red-600">Не удалось добавить слот.</p>}
    </div>
  );
}
