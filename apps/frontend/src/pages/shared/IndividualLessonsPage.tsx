import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod, Role } from "@oplata/shared";
import {
  createIndividualLesson,
  getIndividualLessons,
  markIndividualLessonParticipantPaid,
} from "../../api/individualLessons";
import { getStaff } from "../../api/users";
import { getStudents } from "../../api/students";
import { getTenantSettings } from "../../api/tenantSettings";
import { useAuthStore } from "../../store/auth.store";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function CreateLessonForm({ onCreated }: { onCreated: () => void }) {
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff, enabled: isAdmin });
  const teachers = staff?.filter((s) => s.role === Role.TEACHER) ?? [];

  const [teacherId, setTeacherId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);

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
        startAt: new Date(`${date}T${time}`).toISOString(),
        durationMinutes,
      }),
    onSuccess: () => {
      onCreated();
      setTeacherId("");
      setSelectedStudents([]);
      setDate("");
      setTime("");
      setDurationMinutes(60);
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
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
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
      {mutation.isError && <p className="text-sm text-red-600">Не удалось создать занятие.</p>}
    </form>
  );
}

export default function IndividualLessonsPage() {
  const queryClient = useQueryClient();
  const { data: lessons, isLoading } = useQuery({ queryKey: ["individual-lessons"], queryFn: getIndividualLessons });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });

  const payMutation = useMutation({
    mutationFn: ({ participantId, method }: { participantId: string; method: PaymentMethod }) =>
      markIndividualLessonParticipantPaid(participantId, method),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Индивидуальные занятия</h2>
      <CreateLessonForm onCreated={invalidate} />

      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {lessons?.map((lesson) => (
          <li key={lesson.id} className="space-y-2 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800">{formatDateTime(lesson.startAt)}</p>
                <p className="text-sm text-slate-500">
                  {lesson.teacherName} · {lesson.durationMinutes} мин · {lesson.totalPrice}
                </p>
              </div>
            </div>
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
                      {settings?.isCardEnabled && (
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
          </li>
        ))}
        {lessons?.length === 0 && <li className="px-4 py-4 text-slate-500">Занятий пока нет</li>}
      </ul>
    </div>
  );
}
