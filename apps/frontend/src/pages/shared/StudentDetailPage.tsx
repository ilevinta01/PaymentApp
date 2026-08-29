import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod, Role, StudentStatus } from "@oplata/shared";
import { getStudent, updateStudent, updateStudentStatus } from "../../api/students";
import { createPayment } from "../../api/payments";
import { getIndividualLessonsForStudent } from "../../api/individualLessons";
import { getTenantSettings } from "../../api/tenantSettings";
import { useAuthStore } from "../../store/auth.store";
import TelegramChatPicker from "../../components/TelegramChatPicker";

const STATUS_LABELS: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "Активен",
  [StudentStatus.SICK]: "Болезнь",
  [StudentStatus.VACATION]: "Отпуск",
  [StudentStatus.PAUSE]: "Перерыв",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => getStudent(studentId!),
    enabled: !!studentId,
  });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const { data: individualLessons } = useQuery({
    queryKey: ["individual-lessons-for-student", studentId],
    queryFn: () => getIndividualLessonsForStudent(studentId!),
    enabled: !!studentId && !!settings?.isIndividualLessonsEnabled,
  });

  const invalidateStudent = () => {
    queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  // Оплата
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amount, setAmount] = useState("");
  const paymentMutation = useMutation({
    mutationFn: () =>
      createPayment({
        studentId: studentId!,
        paymentMethod: method,
        amount: isAdmin ? Number(amount) : undefined,
      }),
    onSuccess: () => {
      invalidateStudent();
      setAmount("");
    },
  });

  // Статус приостановки (только Супер-Админ)
  const statusMutation = useMutation({
    mutationFn: (status: StudentStatus) => updateStudentStatus(studentId!, { status }),
    onSuccess: invalidateStudent,
  });

  // Контактные данные
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    parentFullName: "",
    parentPhone: "",
    parentTelegramChatId: "",
    phone: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    if (student) {
      setForm({
        parentFullName: student.parentFullName ?? "",
        parentPhone: student.parentPhone ?? "",
        parentTelegramChatId: student.parentTelegramChatId ?? "",
        phone: student.phone ?? "",
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
      });
    }
  }, [student]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateStudent(studentId!, {
        parentFullName: form.parentFullName,
        parentPhone: form.parentPhone,
        parentTelegramChatId: form.parentTelegramChatId,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || undefined,
      }),
    onSuccess: () => {
      invalidateStudent();
      setEditing(false);
    },
  });

  if (isLoading || !student) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{student.fullName}</h2>
        <p className="text-sm text-slate-500">
          {student.group?.name} · {student.group?.monthlyPrice} / мес
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              student.isPaidCurrentMonth ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {student.isPaidCurrentMonth ? "Оплачено за текущий месяц" : "Не оплачено за текущий месяц"}
          </span>
          {isAdmin ? (
            <select
              value={student.status}
              onChange={(e) => statusMutation.mutate(e.target.value as StudentStatus)}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {Object.values(StudentStatus).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {STATUS_LABELS[student.status]}
            </span>
          )}
        </div>
      </div>

      {!student.isPaidCurrentMonth && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">Зафиксировать оплату</h3>
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
            onClick={() => paymentMutation.mutate()}
            disabled={paymentMutation.isPending || (isAdmin && !amount)}
            className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 font-medium text-white disabled:opacity-60"
          >
            {paymentMutation.isPending ? "Сохраняем…" : "Записать оплату"}
          </button>
          {paymentMutation.isError && <p className="text-sm text-red-600">Не удалось записать оплату.</p>}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Контактные данные</h3>
          {isAdmin && (
            <button onClick={() => setEditing((v) => !v)} className="text-sm font-medium text-[var(--brand-primary)]">
              {editing ? "Отмена" : "Изменить"}
            </button>
          )}
        </div>

        {!editing && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Дата рождения</dt>
              <dd className="text-right text-slate-800">{formatDate(student.dateOfBirth)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Телефон ученика</dt>
              <dd className="text-right text-slate-800">{student.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ФИО родителя</dt>
              <dd className="text-right text-slate-800">{student.parentFullName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Телефон родителя</dt>
              <dd className="text-right text-slate-800">{student.parentPhone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Telegram родителя</dt>
              <dd className="text-right text-slate-800">
                {student.parentTelegramChatId ? "подключён" : "—"}
              </dd>
            </div>
          </dl>
        )}

        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              <span className="text-slate-600">Дата рождения</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Телефон ученика</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">ФИО родителя</span>
              <input
                value={form.parentFullName}
                onChange={(e) => setForm({ ...form, parentFullName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Телефон родителя</span>
              <input
                value={form.parentPhone}
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Telegram родителя (для чеков)</span>
              <input
                value={form.parentTelegramChatId}
                onChange={(e) => setForm({ ...form, parentTelegramChatId: e.target.value })}
                placeholder="chat_id"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <TelegramChatPicker onSelect={(chatId) => setForm({ ...form, parentTelegramChatId: chatId })} />
            <button
              disabled={updateMutation.isPending}
              className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 font-medium text-white disabled:opacity-60"
            >
              {updateMutation.isPending ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        )}
      </div>

      {settings?.isIndividualLessonsEnabled && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">Индивидуальные занятия</h3>
          <ul className="divide-y divide-slate-200">
            {individualLessons?.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="text-slate-800">
                    {new Date(p.individualLesson.startAt).toLocaleDateString("ru-RU")} ·{" "}
                    {p.individualLesson.teacherName}
                  </p>
                  <p className="text-slate-500">Доля: {p.shareAmount}</p>
                </div>
                <span className={p.isPaid ? "text-emerald-600" : "text-red-600"}>
                  {p.isPaid ? "Оплачено" : "Не оплачено"}
                </span>
              </li>
            ))}
            {individualLessons?.length === 0 && <li className="py-2 text-slate-500">Занятий пока не было</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
