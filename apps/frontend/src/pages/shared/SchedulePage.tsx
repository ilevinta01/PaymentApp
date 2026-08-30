import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IndividualLessonDto, Role, ScheduleGroupOccurrenceDto, ScheduleMode, ScheduleView } from "@oplata/shared";
import { getSchedule } from "../../api/schedule";
import { getStaff } from "../../api/users";
import { getStudents } from "../../api/students";
import { getRooms } from "../../api/rooms";
import { getTenantSettings } from "../../api/tenantSettings";
import { useAuthStore } from "../../store/auth.store";
import { useBasePath } from "../../hooks/useBasePath";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MODE_LABELS: Record<ScheduleMode, string> = { teacher: "Преподаватель", student: "Ученик", room: "Зал" };
const VIEW_LABELS: Record<ScheduleView, string> = { day: "День", week: "Неделя", month: "Месяц" };
const DEFAULT_HOUR_START = 8;
const DEFAULT_HOUR_END = 21;
const HOUR_PX = 56;

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

function timeStrToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface GridItem {
  key: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  color: string;
  title: string;
  tooltipLines: string[];
  onClick?: () => void;
}

function TimeGrid({
  days,
  hourStart,
  hourEnd,
  items,
}: {
  days: { date: string; label: string }[];
  hourStart: number;
  hourEnd: number;
  items: GridItem[];
}) {
  const hours = Array.from({ length: hourEnd - hourStart + 1 }, (_, i) => hourStart + i);
  const gridHeight = (hourEnd - hourStart) * HOUR_PX;

  function top(minutes: number) {
    const clamped = Math.min(Math.max(minutes, hourStart * 60), hourEnd * 60);
    return ((clamped - hourStart * 60) / 60) * HOUR_PX;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="flex w-full" style={{ minWidth: days.length > 1 ? days.length * 44 + 44 : 260 }}>
        <div className="w-9 shrink-0 border-r border-slate-100 sm:w-11">
          <div className="h-8 border-b border-slate-100" />
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_PX }} className="relative">
              <span className="absolute -top-2 right-1 text-[10px] text-slate-400 sm:text-[11px]">{h}:00</span>
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayItems = items.filter((it) => it.date === day.date);
          return (
            <div key={day.date} className="relative min-w-0 flex-1 border-r border-slate-100 last:border-r-0">
              <div className="flex h-8 items-center justify-center truncate border-b border-slate-100 px-0.5 text-xs font-semibold text-slate-700">
                {day.label}
              </div>
              <div className="relative" style={{ height: gridHeight }}>
                {hours.slice(1).map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: (h - hourStart) * HOUR_PX }}
                  />
                ))}
                {dayItems.length === 0 && (
                  <p className="absolute inset-x-0 top-4 text-center text-xs text-slate-300">Занятий нет</p>
                )}
                {dayItems.map((item) => (
                  <div
                    key={item.key}
                    className="group absolute left-0.5 right-0.5 z-0 hover:z-10"
                    style={{ top: top(item.startMinutes), height: Math.max(top(item.endMinutes) - top(item.startMinutes), 18) }}
                  >
                    <button
                      type="button"
                      onClick={item.onClick}
                      disabled={!item.onClick}
                      className="h-full w-full overflow-hidden truncate whitespace-nowrap rounded px-1 text-left text-[11px] leading-tight text-white shadow-sm"
                      style={{ background: item.color, cursor: item.onClick ? "pointer" : "default" }}
                    >
                      {item.title}
                    </button>
                    <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-56 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg group-hover:block">
                      <p className="font-semibold">{item.title}</p>
                      {item.tooltipLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      {item.onClick && <p className="mt-1 font-medium text-[var(--brand-primary)]">Открыть →</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildItems(
  groupOccurrences: ScheduleGroupOccurrenceDto[],
  individualLessons: IndividualLessonDto[],
  lessonColor: string,
  onLessonClick: (lesson: IndividualLessonDto) => void,
): GridItem[] {
  const groupItems: GridItem[] = groupOccurrences.map((g) => ({
    key: `g-${g.groupId}-${g.date}-${g.startTime}`,
    date: g.date,
    startMinutes: timeStrToMinutes(g.startTime),
    endMinutes: timeStrToMinutes(g.endTime),
    color: g.groupColor,
    title: `Группа «${g.groupName}»`,
    tooltipLines: [`${g.startTime}–${g.endTime}`, g.roomName ?? ""].filter(Boolean),
  }));

  const lessonItems: GridItem[] = individualLessons.map((l) => {
    const start = new Date(l.startAt);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    return {
      key: `l-${l.id}`,
      date: l.startAt.slice(0, 10),
      startMinutes,
      endMinutes: startMinutes + l.durationMinutes,
      color: lessonColor,
      title: l.subject ? `Инд. · ${l.subject}` : "Индивидуальное",
      tooltipLines: [
        `Преподаватель: ${l.teacherName}`,
        `Ученики: ${l.participants.map((p) => p.studentName).join(", ")}`,
        l.roomName ? `Зал: ${l.roomName}` : "",
      ].filter(Boolean),
      onClick: () => onLessonClick(l),
    };
  });

  return [...groupItems, ...lessonItems];
}

export default function SchedulePage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff, enabled: isAdmin });
  const teachers = staff?.filter((s) => s.role === Role.TEACHER) ?? [];
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const lessonColor = settings?.individualLessonColor ?? "#f59e0b";

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

  const selectedRoom = mode === "room" ? rooms?.find((r) => r.id === roomId) : undefined;
  const hourStart = selectedRoom ? Math.floor(timeStrToMinutes(selectedRoom.workingHoursStart) / 60) : DEFAULT_HOUR_START;
  const hourEnd = selectedRoom ? Math.ceil(timeStrToMinutes(selectedRoom.workingHoursEnd) / 60) : DEFAULT_HOUR_END;

  const goToLesson = (lesson: IndividualLessonDto) => navigate(`${basePath}/individual-lessons?edit=${lesson.id}`);

  const days =
    data && view !== "month"
      ? Array.from({ length: view === "day" ? 1 : 7 }, (_, i) => addDays(data.rangeStart, i)).map((d) => ({
          date: d,
          label: `${DAY_LABELS[(new Date(d).getDay() + 6) % 7]}, ${formatDayDate(d)}`,
        }))
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

  const items = data ? buildItems(data.groupOccurrences, data.individualLessons, lessonColor, goToLesson) : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Расписание</h2>

      <div className="flex flex-nowrap gap-2 overflow-x-auto">
        {(["teacher", "student", "room"] as ScheduleMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === m ? "bg-[var(--brand-primary)] text-white" : "border border-slate-300 text-slate-600"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="flex flex-nowrap gap-2 overflow-x-auto">
        {(["day", "week", "month"] as ScheduleView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              view === v ? "bg-[var(--brand-primary)] text-white" : "border border-slate-300 text-slate-600"
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
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

      <div className="flex flex-nowrap items-center justify-between gap-2">
        <button
          onClick={() => setDate((d) => shiftDate(d, view, -1))}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          ← Пред.
        </button>
        {data && (
          <span className="truncate text-sm text-slate-500">
            {view === "day" ? formatDayDate(data.rangeStart) : `${formatDayDate(data.rangeStart)} – ${formatDayDate(addDays(data.rangeEnd, -1))}`}
          </span>
        )}
        <button
          onClick={() => setDate((d) => shiftDate(d, view, 1))}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
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

      {data && view !== "month" && <TimeGrid days={days} hourStart={hourStart} hourEnd={hourEnd} items={items} />}

      {data && view === "month" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {monthDays.map((d) => {
            const dayItems = items.filter((it) => it.date === d);
            return (
              <div key={d} className="min-h-[76px] rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-xs font-semibold text-slate-500">{formatDayDate(d)}</p>
                {dayItems.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-300">—</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {dayItems.map((item) => (
                      <li key={item.key} className="flex items-center gap-1 truncate text-xs text-slate-600">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                        {item.title}
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
