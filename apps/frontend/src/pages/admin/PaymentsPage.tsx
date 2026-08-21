import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentDto, PaymentMethod } from "@oplata/shared";
import { getStudents } from "../../api/students";
import { createPayment, getPayments, updatePayment } from "../../api/payments";
import { getTenantSettings } from "../../api/tenantSettings";
import { getLastMonths } from "../../utils/months";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Наличные",
  [PaymentMethod.CARD]: "Карта",
};

function EditablePaymentRow({
  payment,
  isCardEnabled,
  onUpdated,
}: {
  payment: PaymentDto;
  isCardEnabled: boolean;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(payment.amount);
  const [method, setMethod] = useState<PaymentMethod>(payment.paymentMethod);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => updatePayment(payment.id, { amount: Number(amount), paymentMethod: method, reason }),
    onSuccess: () => {
      setEditing(false);
      setReason("");
      onUpdated();
    },
  });

  if (!editing) {
    return (
      <li className="flex justify-between px-4 py-3">
        <span className="text-slate-800">{payment.student?.fullName}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            {payment.amount} · {METHOD_LABEL[payment.paymentMethod]}
          </span>
          <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 font-medium">
            Изменить
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="px-4 py-3 space-y-2 bg-slate-50">
      <p className="text-slate-800">{payment.student?.fullName}</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2"
        />
        {isCardEnabled && (
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value={PaymentMethod.CASH}>Наличные</option>
            <option value={PaymentMethod.CARD}>Карта</option>
          </select>
        )}
      </div>
      <input
        placeholder="Причина изменения (обязательно)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || reason.trim().length < 3}
          className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-60"
        >
          Сохранить
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          Отмена
        </button>
      </div>
      {mutation.isError && <p className="text-sm text-red-600">Не удалось сохранить изменение.</p>}
    </li>
  );
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const months = getLastMonths(6);
  const [periodMonth, setPeriodMonth] = useState(months[0].value);
  const { data: students } = useQuery({ queryKey: ["students"], queryFn: () => getStudents() });
  const { data: payments } = useQuery({
    queryKey: ["payments", periodMonth],
    queryFn: () => getPayments(periodMonth),
  });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  const createMutation = useMutation({
    mutationFn: () => createPayment({ studentId, paymentMethod: method, amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setStudentId("");
      setAmount("");
      setMethod(PaymentMethod.CASH);
    },
  });

  const invalidatePayments = () => queryClient.invalidateQueries({ queryKey: ["payments"] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Оплаты</h2>
        <select
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-lg p-4"
      >
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Ученик…</option>
          {students?.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName}
            </option>
          ))}
        </select>
        <input
          placeholder="Сумма"
          type="number"
          min={0.01}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-32 rounded-lg border border-slate-300 px-3 py-2"
        />
        {settings?.isCardEnabled && (
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value={PaymentMethod.CASH}>Наличные</option>
            <option value={PaymentMethod.CARD}>Карта</option>
          </select>
        )}
        <button
          disabled={createMutation.isPending}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium disabled:opacity-60"
        >
          {createMutation.isPending ? "Сохраняем…" : "Записать оплату"}
        </button>
      </form>
      {createMutation.isError && (
        <p className="text-sm text-red-600">Не удалось записать оплату. Проверьте данные.</p>
      )}
      <ul className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
        {payments?.map((payment) => (
          <EditablePaymentRow
            key={payment.id}
            payment={payment}
            isCardEnabled={settings?.isCardEnabled ?? false}
            onUpdated={invalidatePayments}
          />
        ))}
        {payments?.length === 0 && <li className="px-4 py-3 text-slate-500">Оплат за этот месяц пока нет</li>}
      </ul>
    </div>
  );
}
