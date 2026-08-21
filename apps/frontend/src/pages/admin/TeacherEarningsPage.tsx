import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PaymentMethod } from "@oplata/shared";
import { getTeacherEarnings } from "../../api/reports";
import { getLastMonths } from "../../utils/months";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Наличные",
  [PaymentMethod.CARD]: "Карта",
};

export default function TeacherEarningsPage() {
  const months = getLastMonths(6);
  const [periodMonth, setPeriodMonth] = useState(months[0].value);
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-earnings", periodMonth],
    queryFn: () => getTeacherEarnings(periodMonth),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">По преподавателям</h2>
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
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <div className="space-y-4">
        {data?.map((teacher) => (
          <div key={teacher.teacherId} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{teacher.teacherName}</p>
              <p className="font-semibold text-indigo-600">{teacher.totalAmount}</p>
            </div>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {teacher.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-slate-700">{payment.studentName}</span>
                  <span className="text-right text-slate-500">
                    {payment.amount} · {METHOD_LABEL[payment.paymentMethod]}
                    <br />
                    {new Date(payment.dateTime).toLocaleString("ru-RU")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {data?.length === 0 && <p className="text-slate-500">Платежей за этот месяц нет</p>}
      </div>
    </div>
  );
}
