import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndividualLessonDto, PaymentMethod, Role } from "@oplata/shared";
import {
  createIndividualLesson,
  getIndividualLessons,
  markIndividualLessonParticipantPaid,
  updateIndividualLesson,
} from "../../api/individualLessons";
import { getStaff } from "../../api/users";
import { getStudents } from "../../api/students";
import { getTenantSettings } from "../../api/tenantSettings";
import { getRooms } from "../../api/rooms";
import { useAuthStore } from "../../store/auth.store";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

// Пересечение с расписанием группы у ученика не блокируется намертво (в отличие от преподавателя) —
// бэкенд отвечает 409 с requiresConfirmation:true, и админ/преподаватель подтверждает создание
// диалогом confirm(), после чего запрос повторяется с confirmStudentConflict:true.
function getConfirmationRequest(error: unknown): string | null {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { requiresConfirmation?: boolean; message?: string } } }).response
      ?.data;
    if (data?.requiresConfirmation && typeof data.message === "string") return data.message;
  }
  return null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function CreateLessonForm({ onCreated, showRooms }: { onCreated: () => void; showRooms: boolean }) {
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff, enabled: isAdmin });
  const teachers = staff?.filter((s) => s.role === Role.TEACHER) ?? [];
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms, enabled: showRooms });

  const [teacherId, setTeacherId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [roomId, setRoomId] = useState("");
  const [subject, setSubject] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const forceConfirmRef = useRef(false);

  const trimmedQuery = studentQuery.trim();
  const { data: foundStudents } = useQuery({
    queryKey: ["students-search-for-lesson", trimmedQuery],
    queryFn: () => getStudents({ search: trimmedQuery }),
    enabled: trimmedQuery.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createIndividualLesson({
        teacherId: isAdmin ? teacherId : undefined,
        studentIds: selectedStudents.map((s) => s.id),
        startAt: new Date(`${date}T${hour}:${minute}`).toISOString(),
        durationMinutes,
        roomId: roomId || undefined,
        subject: subject.trim() || undefined,
        confirmStudentConflict: forceConfirmRef.current,
      }),
    onSuccess: (result) => {
      forceConfirmRef.current = false;
      onCreated();
      setWarnings(result.warnings ?? []);
      setTeacherId("");
      setSelectedStudents([]);
      setDate("");
      setHour("");
      setMinute("");
      setDurationMinutes(60);
      setRoomId("");
      setSubject("");
    },
    onError: (error) => {
      const confirmMessage = getConfirmationRequest(error);
      if (confirmMessage && window.confirm(confirmMessage)) {
        forceConfirmRef.current = true;
        mutation.mutate();
      } else {
        forceConfirmRef.current = false;
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="text-lg font-semibold text-slate-900">Новое индивидуальное занятие</h2>

      {isAdmin && (
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Выберите преподавателя</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id} disabled={!t.individualLessonRate}>
              {t.fullName}
              {!t.individualLessonRate ? " (ставка не задана)" : ""}
            </option>
          ))}
        </select>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {selectedStudents.map((s) => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
              {s.fullName}
              <button
                type="button"
                onClick={() => setSelectedStudents((list) => list.filter((x) => x.id !== s.id))}
                className="text-slate-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          placeholder="Найти ученика по имени…"
          value={studentQuery}
          onChange={(e) => setStudentQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {trimmedQuery.length >= 2 && (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
            {foundStudents
              ?.filter((s) => !selectedStudents.some((sel) => sel.id === s.id))
              .map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudents((list) => [...list, { id: s.id, fullName: s.fullName }]);
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
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <select
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          required
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="" disabled>
            Час
          </option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          required
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="" disabled>
            Мин
          </option>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={5}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          required
          className="w-28 rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="self-center text-sm text-slate-500">мин</span>
      </div>

      {showRooms && rooms && rooms.length > 0 && (
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Без зала</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      )}

      <input
        placeholder="Тип занятия (необязательно): математика, латино, балет…"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />

      <p className="text-xs text-slate-400">
        Стоимость рассчитается автоматически (ставка преподавателя × длительность) и поровну разделится между
        выбранными учениками. Учитель и родители получат уведомление в Telegram, если оно подключено.
      </p>

      <button
        disabled={mutation.isPending || selectedStudents.length === 0}
        className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 font-medium text-white disabled:opacity-60"
      >
        {mutation.isPending ? "Создаём…" : "Создать занятие"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600">{getErrorMessage(mutation.error, "Не удалось создать занятие.")}</p>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {warnings.map((w) => (
            <p key={w}>⚠ {w}</p>
          ))}
        </div>
      )}
    </form>
  );
}

function EditLessonForm({
  lesson,
  showRooms,
  onDone,
  onWarnings,
}: {
  lesson: IndividualLessonDto;
  showRooms: boolean;
  onDone: () => void;
  onWarnings: (warnings: string[]) => void;
}) {
  const start = new Date(lesson.startAt);
  const [date, setDate] = useState(start.toISOString().slice(0, 10));
  const [hour, setHour] = useState(String(start.getHours()).padStart(2, "0"));
  const [minute, setMinute] = useState(String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0"));
  const [durationMinutes, setDurationMinutes] = useState(lesson.durationMinutes);
  const [roomId, setRoomId] = useState(lesson.roomId ?? "");
  const [subject, setSubject] = useState(lesson.subject ?? "");
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms, enabled: showRooms });
  const forceConfirmRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateIndividualLesson(lesson.id, {
        startAt: new Date(`${date}T${hour}:${minute}`).toISOString(),
        durationMinutes,
        roomId,
        subject: subject.trim(),
        confirmStudentConflict: forceConfirmRef.current,
      }),
    onSuccess: (result) => {
      forceConfirmRef.current = false;
      onWarnings(result.warnings ?? []);
      onDone();
    },
    onError: (error) => {
      const confirmMessage = getConfirmationRequest(error);
      if (confirmMessage && window.confirm(confirmMessage)) {
        forceConfirmRef.current = true;
        mutation.mutate();
      } else {
        forceConfirmRef.current = false;
      }
    },
  });

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <select
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={5}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="self-center text-sm text-slate-500">мин</span>
      </div>
      {showRooms && rooms && rooms.length > 0 && (
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Без зала</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      )}
      <input
        placeholder="Тип занятия (необязательно)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Сохранить
        </button>
        <button onClick={onDone} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
          Отмена
        </button>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-600">{getErrorMessage(mutation.error, "Не удалось изменить занятие.")}</p>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  canEdit,
  isCardEnabled,
  showRooms,
  autoEdit,
  onChanged,
  onWarnings,
  payMutation,
}: {
  lesson: IndividualLessonDto;
  canEdit: boolean;
  isCardEnabled: boolean;
  showRooms: boolean;
  autoEdit: boolean;
  onChanged: () => void;
  onWarnings: (warnings: string[]) => void;
  payMutation: ReturnType<typeof useMutation<unknown, Error, { participantId: string; method: PaymentMethod }>>;
}) {
  const [editing, setEditing] = useState(autoEdit && canEdit);
  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (autoEdit) rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <li ref={rowRef} className={`space-y-2 px-4 py-4 ${autoEdit ? "bg-amber-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-800">
            {formatDateTime(lesson.startAt)}
            {lesson.subject ? ` · ${lesson.subject}` : ""}
          </p>
          <p className="text-sm text-slate-500">
            {lesson.teacherName} · {lesson.durationMinutes} мин · {lesson.totalPrice}
            {lesson.roomName ? ` · ${lesson.roomName}` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-sm font-medium text-[var(--brand-primary)]">
            Изменить
          </button>
        )}
      </div>

      {editing && (
        <EditLessonForm
          lesson={lesson}
          showRooms={showRooms}
          onWarnings={onWarnings}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      {!editing && (
        <ul className="space-y-1">
          {lesson.participants.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-700">
                {p.studentName} — {p.shareAmount}
              </span>
              {p.isPaid ? (
                <span className="text-emerald-600">Оплачено ({p.paymentMethod})</span>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => payMutation.mutate({ participantId: p.id, method: PaymentMethod.CASH })}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
                  >
                    Наличные
                  </button>
                  {isCardEnabled && (
                    <button
                      onClick={() => payMutation.mutate({ participantId: p.id, method: PaymentMethod.CARD })}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
                    >
                      Карта
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function IndividualLessonsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === Role.SUPER_ADMIN;
  const { data: lessons, isLoading } = useQuery({ queryKey: ["individual-lessons"], queryFn: getIndividualLessons });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });

  const payMutation = useMutation({
    mutationFn: ({ participantId, method }: { participantId: string; method: PaymentMethod }) =>
      markIndividualLessonParticipantPaid(participantId, method),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Индивидуальные занятия</h2>
      {warnings.length > 0 && (
        <div className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {warnings.map((w) => (
            <p key={w}>⚠ {w}</p>
          ))}
        </div>
      )}
      <CreateLessonForm onCreated={invalidate} showRooms={!!settings?.isScheduleEnabled} />

      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {lessons?.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            canEdit={isAdmin || lesson.teacherId === currentUser?.id}
            isCardEnabled={!!settings?.isCardEnabled}
            showRooms={!!settings?.isScheduleEnabled}
            autoEdit={lesson.id === editId}
            onChanged={invalidate}
            onWarnings={setWarnings}
            payMutation={payMutation}
          />
        ))}
        {lessons?.length === 0 && <li className="px-4 py-4 text-slate-500">Занятий пока нет</li>}
      </ul>
    </div>
  );
}
