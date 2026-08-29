import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Role } from "@oplata/shared";
import { getWeeklySchedule } from "../../api/schedule";
import { getStaff } from "../../api/users";
import { useAuthStore } from "../../store/auth.store";

const DAY_LABELS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function SchedulePage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff, enabled: isAdmin });
  const teachers = staff?.filter((s) => s.role === Role.TEACHER) ?? [];

  const [teacherId, setTeacherId] = useState("");
  const [weekStartParam, setWeekStartParam] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-schedule", weekStartParam, teacherId],
    queryFn: () => getWeeklySchedule({ weekStart: weekStartParam, teacherId: teacherId || undefined }),
    enabled: !isAdmin || !!teacherId,
  });

  const days = data
    ? Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i))
    : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Расписание</h2>

      {isAdmin && (
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Выберите преподавателя</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStartParam((d) => addDays(d, -7))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          ← Пред. неделя
        </button>
        {data && (
          <span className="text-sm text-slate-500">
            {formatDayDate(data.weekStart)} – {formatDayDate(addDays(data.weekStart, 6))}
          </span>
        )}
        <button
          onClick={() => setWeekStartParam((d) => addDays(d, 7))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          След. неделя →
        </button>
      </div>

      {isAdmin && !teacherId && <p className="text-slate-500">Выберите преподавателя, чтобы увидеть расписание.</p>}
      {isLoading && <p className="text-slate-500">Загрузка…</p>}

      {data && (
        <div className="space-y-3">
          {days.map((date, i) => {
            const groupItems = data.groupOccurrences.filter((g) => g.date === date);
            const lessonItems = data.individualLessons.filter((l) => l.startAt.slice(0, 10) === date);
            const items = [
              ...groupItems.map((g) => ({ time: g.startTime, label: `Группа «${g.groupName}»`, sub: `до ${g.endTime}` })),
              ...lessonItems.map((l) => ({
                time: new Date(l.startAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
                label: "Индивидуальное занятие",
                sub: l.participants.map((p) => p.studentName).join(", "),
              })),
            ].sort((a, b) => a.time.localeCompare(b.time));

            return (
              <div key={date} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  {DAY_LABELS[i]}, {formatDayDate(date)}
                </p>
                {items.length === 0 && <p className="text-sm text-slate-400">Занятий нет</p>}
                <ul className="space-y-1">
                  {items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-12 shrink-0 font-medium text-slate-800">{item.time}</span>
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-400">{item.sub}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
