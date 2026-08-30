import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod, Role, StudentDto } from "@oplata/shared";
import { getStudents } from "../../api/students";
import { getGroups } from "../../api/groups";
import { createPayment } from "../../api/payments";
import { getIndividualLessonsForStudent, markIndividualLessonParticipantPaid } from "../../api/individualLessons";
import { getTenantSettings } from "../../api/tenantSettings";
import { useAuthStore } from "../../store/auth.store";

type Mode = "search" | "groups";

function StudentRow({ student, onSelect }: { student: StudentDto; onSelect: () => void }) {
  return (
    <li>
      <button
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-slate-50"
      >
        <span className="font-medium text-slate-800">{student.fullName}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            student.isPaidCurrentMonth ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {student.isPaidCurrentMonth ? "Оплачено" : "Не оплачено"}
        </span>
      </button>
    </li>
  );
}

function IndividualLessonsSection({ studentId, isCardEnabled }: { studentId: string; isCardEnabled: boolean }) {
  const queryClient = useQueryClient();
  const { data: lessons } = useQuery({
    queryKey: ["individual-lessons-for-student", studentId],
    queryFn: () => getIndividualLessonsForStudent(studentId),
  });

  const payMutation = useMutation({
    mutationFn: ({ participantId, method }: { participantId: string; method: PaymentMethod }) =>
      markIndividualLessonParticipantPaid(participantId, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individual-lessons-for-student", studentId] });
    },
  });

  const unpaid = lessons?.filter((p) => !p.isPaid) ?? [];
  if (lessons && unpaid.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <p className="text-sm font-medium text-slate-700">Неоплаченные индивидуальные занятия</p>
      <ul className="space-y-2">
        {unpaid.map((p) => {
          const isUpcoming = new Date(p.individualLesson.startAt) > new Date();
          return (
            <li key={p.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-slate-800">
                    {new Date(p.individualLesson.startAt).toLocaleString("ru-RU")}
                    {p.individualLesson.subject ? ` · ${p.individualLesson.subject}` : ""}
                  </p>
                  <p className="text-slate-500">
                    {p.individualLesson.teacherName} ·{" "}
                    <span className={isUpcoming ? "text-amber-600" : "text-slate-500"}>
                      {isUpcoming ? "предстоит" : "прошло"}
                    </span>{" "}
                    · {p.shareAmount}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => payMutation.mutate({ participantId: p.id, method: PaymentMethod.CASH })}
                  disabled={payMutation.isPending}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                >
                  Наличные
                </button>
                {isCardEnabled && (
                  <button
                    onClick={() => payMutation.mutate({ participantId: p.id, method: PaymentMethod.CARD })}
                    disabled={payMutation.isPending}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                  >
                    Карта
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PaymentForm({ student, onDone }: { student: StudentDto; onDone: () => void }) {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amount, setAmount] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createPayment({
        studentId: student.id,
        paymentMethod: method,
        amount: isAdmin ? Number(amount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-search-quick-payment"] });
      queryClient.invalidateQueries({ queryKey: ["debtors"] });
      onDone();
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">{student.fullName}</p>
          <p className="text-sm text-slate-500">
            {student.group?.name} · {student.group?.monthlyPrice} / мес
          </p>
        </div>
        <button onClick={onDone} className="text-sm text-slate-400">
          ×
        </button>
      </div>

      {student.isPaidCurrentMonth ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Уже оплачено за текущий месяц.</p>
      ) : (
        <>
          {isAdmin ? (
            <input
              type="number"
              min={0.01}
              step="0.01"
              placeholder="Сумма"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          ) : (
            <p className="text-sm text-slate-500">Фиксированная сумма: {student.group?.monthlyPrice}</p>
          )}
          {settings?.isCardEnabled && (
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value={PaymentMethod.CASH}>Наличные</option>
              <option value={PaymentMethod.CARD}>Карта</option>
            </select>
          )}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (isAdmin && !amount)}
            className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? "Сохраняем…" : "Записать оплату"}
          </button>
          {mutation.isError && <p className="text-sm text-red-600">Не удалось записать оплату.</p>}
        </>
      )}

      {mutation.isSuccess && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Оплата записана. Можно выбрать следующего ученика.</p>
      )}

      {settings?.isIndividualLessonsEnabled && (
        <IndividualLessonsSection studentId={student.id} isCardEnabled={!!settings?.isCardEnabled} />
      )}
    </div>
  );
}

export default function PaymentQuickPage() {
  const [mode, setMode] = useState<Mode>("search");
  const [selected, setSelected] = useState<StudentDto | null>(null);

  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const { data: foundStudents } = useQuery({
    queryKey: ["students-search-quick-payment", trimmedQuery],
    queryFn: () => getStudents({ search: trimmedQuery }),
    enabled: mode === "search" && trimmedQuery.length >= 2,
  });

  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: getGroups, enabled: mode === "groups" });
  const [groupId, setGroupId] = useState("");
  const { data: groupStudents } = useQuery({
    queryKey: ["students-quick-payment", { groupId }],
    queryFn: () => getStudents({ groupId }),
    enabled: mode === "groups" && !!groupId,
  });

  const selectStudent = (student: StudentDto) => setSelected(student);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Оплата</h2>

      {selected ? (
        <PaymentForm student={selected} onDone={() => setSelected(null)} />
      ) : (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("search")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "search" ? "bg-[var(--brand-primary)] text-white" : "border border-slate-300 text-slate-600"
              }`}
            >
              Поиск по имени
            </button>
            <button
              onClick={() => setMode("groups")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "groups" ? "bg-[var(--brand-primary)] text-white" : "border border-slate-300 text-slate-600"
              }`}
            >
              По группам
            </button>
          </div>

          {mode === "search" && (
            <div className="space-y-2">
              <input
                placeholder="Введите имя ученика…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              {trimmedQuery.length >= 2 && (
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {foundStudents?.map((student) => (
                    <StudentRow key={student.id} student={student} onSelect={() => selectStudent(student)} />
                  ))}
                  {foundStudents?.length === 0 && <li className="px-4 py-3 text-slate-500">Никого не найдено</li>}
                </ul>
              )}
            </div>
          )}

          {mode === "groups" && (
            <div className="space-y-2">
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Выберите группу</option>
                {groups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {groupId && (
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {groupStudents?.map((student) => (
                    <StudentRow key={student.id} student={student} onSelect={() => selectStudent(student)} />
                  ))}
                  {groupStudents?.length === 0 && <li className="px-4 py-3 text-slate-500">В группе нет учеников</li>}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
