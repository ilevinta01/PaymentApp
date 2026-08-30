import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Role, ScheduleMode, ScheduleView } from "@oplata/shared";
import { getSchedule } from "../../api/schedule";
import { getStaff } from "../../api/users";
import { getStudents } from "../../api/students";
import { getRooms } from "../../api/rooms";
import { useAuthStore } from "../../store/auth.store";

const DAY_LABELS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const MODE_LABELS: Record<ScheduleMode, string> = { teacher: "Преподаватель", student: "Ученик", room: "Зал" };
const VIEW_LABELS: Record<ScheduleView, string> = { day: "День", week: "Неделя", month: "Месяц" };

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, view: ScheduleView, direction: 1 | -1): string {
  const d = new Date(dateStr);
  if (view === "day") d.setDate(d.getDate() + direction);
  else if (view === "week") d.setDate(d.getDate() + 7 * direction);
  else d.setMonth(d.getMonth() + direction);
  return toDateStr(d);
}

function formatDayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function DayCard({
  date,
  label,
  groupOccurrences,
  individualLessons,
}: {
  date: string;
  label: string;
  groupOccurrences: { date: string; groupName: string; startTime: string; endTime: string; roomName: string | null }[];
  individualLessons: { startAt: string; teacherName: string; roomName: string | null; participants: { studentName: string }[] }[];
}) {
  const groupItems = groupOccurrences.filter((g) => g.date === date);
  const lessonItems = individualLessons.filter((l) => l.startAt.slice(0, 10) === date);
  const items = [
    ...groupItems.map((g) => ({
      time: g.startTime,
      label: `Группа «${g.groupName}»`,
      sub: [`до ${g.endTime}`, g.roomName].filter(Boolean).join(" · "),
    })),
    ...lessonItems.map((l) => ({
      time: new Date(l.startAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      label: `Индивидуальное · ${l.teacherName}`,
      sub: [l.participants.map((p) => p.studentName).join(", "), l.roomName].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      {items.length === 0 && <p className="text-sm text-slate-400">Занятий нет</p>}
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-12 shrink-0 font-medium text-slate-800">{item.time}</span>
            <span className="text-slate-700">{item.label}</span>
            <span className="text-slate-400">{item.sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SchedulePage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff, enabled: isAdmin });
  const teachers = staff?.filter((s) => s.role === Role.TEACHER) ?? [];
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });

  const [mode, setMode] = useState<ScheduleMode>("teacher");
  const [view, setView] = useState<ScheduleView>("week");
  const [date, setDate] = useState(() => toDateStr(new Date()));
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  const trimmedQuery = studentQuery.trim();
  const { data: foundStudents } = useQuery({
    queryKey: ["students-search-for-schedule", trimmedQuery],
    queryFn: () => getStudents({ search: trimmedQuery }),
    enabled: mode === "student" && trimmedQuery.length >= 2,
  });

  const targetId = mode === "teacher" ? (isAdmin ? teacherId : currentUserId) : mode === "room" ? roomId : studentId;
  const enabled = mode === "teacher" ? !isAdmin || !!teacherId : !!targetId;

  const { data, isLoading } = useQuery({
    queryKey: ["schedule", mode, view, date, targetId],
    queryFn: () => getSchedule({ view, mode, date, targetId }),
    enabled,
  });

  const days =
    data && view !== "month"
      ? Array.from({ length: view === "day" ? 1 : 7 }, (_, i) => addDays(data.rangeStart, i))
      : [];

  const monthDays =
    data && view === "month"
      ? (() => {
          const cells: string[] = [];
          for (let d = new Date(data.rangeStart); toDateStr(d) < data.rangeEnd; d.setDate(d.getDate() + 1)) {
            cells.push(toDateStr(d));
          }
          return cells;
        })()
      : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Расписание</h2>

      <div className="flex flex-wrap gap-2">
        {(["teacher", "student", "room"] as ScheduleMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === m ? "bg-[var(--brand-primary)] text-white" : "border border-slate-300 text-slate-600"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(["day", "week", "month"] as ScheduleView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                view === v ? "bg-[var(--brand-primary)] text-white" : "border border-slate-300 text-slate-600"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {mode === "teacher" && isAdmin && (
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 lg:max-w-sm"
        >
          <option value="">Выберите преподавателя</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
      )}

      {mode === "room" && (
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 lg:max-w-sm"
        >
          <option value="">Выберите зал</option>
          {rooms?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}

      {mode === "student" && (
        <div className="space-y-2 lg:max-w-sm">
          {studentId ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <span className="flex-1 text-slate-800">{studentName}</span>
              <button
                onClick={() => {
                  setStudentId("");
                  setStudentName("");
                }}
                className="text-slate-400"
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <input
                placeholder="Найти ученика по имени…"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              {trimmedQuery.length >= 2 && (
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                  {foundStudents?.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setStudentId(s.id);
                          setStudentName(s.fullName);
                          setStudentQuery("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm active:bg-slate-50"
                      >
                        {s.fullName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate((d) => shiftDate(d, view, -1))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          ← Пред.
        </button>
        {data && (
          <span className="text-sm text-slate-500">
            {formatDayDate(data.rangeStart)} – {formatDayDate(addDays(data.rangeEnd, -1))}
          </span>
        )}
        <button
          onClick={() => setDate((d) => shiftDate(d, view, 1))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          След. →
        </button>
      </div>

      {!enabled && (
        <p className="text-slate-500">
          {mode === "teacher" && "Выберите преподавателя, чтобы увидеть расписание."}
          {mode === "room" && "Выберите зал, чтобы увидеть расписание."}
          {mode === "student" && "Найдите ученика, чтобы увидеть расписание."}
        </p>
      )}
      {isLoading && <p className="text-slate-500">Загрузка…</p>}

      {data && view !== "month" && (
        <div className={view === "week" ? "space-y-3 lg:grid lg:grid-cols-7 lg:gap-3 lg:space-y-0" : "space-y-3"}>
          {days.map((d, i) => (
            <DayCard
              key={d}
              date={d}
              label={
                view === "day"
                  ? `${DAY_LABELS[(new Date(d).getDay() + 6) % 7]}, ${formatDayDate(d)}`
                  : `${DAY_LABELS[i]}, ${formatDayDate(d)}`
              }
              groupOccurrences={data.groupOccurrences}
              individualLessons={data.individualLessons}
            />
          ))}
        </div>
      )}

      {data && view === "month" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {monthDays.map((d) => {
            const groupItems = data.groupOccurrences.filter((g) => g.date === d);
            const lessonItems = data.individualLessons.filter((l) => l.startAt.slice(0, 10) === d);
            const total = groupItems.length + lessonItems.length;
            return (
              <div key={d} className="min-h-[72px] rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-xs font-semibold text-slate-500">{formatDayDate(d)}</p>
                {total === 0 ? (
                  <p className="mt-1 text-xs text-slate-300">—</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {groupItems.map((g, i) => (
                      <li key={`g${i}`} className="truncate text-xs text-slate-600">
                        {g.startTime} {g.groupName}
                      </li>
                    ))}
                    {lessonItems.map((l, i) => (
                      <li key={`l${i}`} className="truncate text-xs text-slate-600">
                        {new Date(l.startAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} инд.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
