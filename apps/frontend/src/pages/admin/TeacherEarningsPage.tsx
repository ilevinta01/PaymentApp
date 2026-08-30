import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TeacherEarningsDto } from "@oplata/shared";
import { getTeacherEarnings } from "../../api/reports";
import { getLastMonths } from "../../utils/months";

const METHOD_LABEL: Record<string, string> = { CASH: "Наличные", CARD: "Карта" };

function TeacherRow({ teacher }: { teacher: TeacherEarningsDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded((v) => !v)}>
        <div>
          <p className="font-semibold text-slate-900">{teacher.teacherName}</p>
          <p className="text-sm text-slate-500">
            От групп: {teacher.groupTotal} · От индивидуальных: {teacher.individualTotal}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold text-[var(--brand-primary)]">{teacher.totalAmount}</p>
          <span className="text-slate-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {teacher.groups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {teacher.groups.map((g) => (
            <span key={g.groupId} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {g.groupName}: {g.amount}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {teacher.payments.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Оплаты от групп</p>
              <ul className="divide-y divide-slate-100 text-sm">
                {teacher.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-slate-700">
                      {payment.studentName} <span className="text-slate-400">({payment.groupName})</span>
                    </span>
                    <span className="text-right text-slate-500">
                      {payment.amount} · {METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod}
                      <br />
                      {new Date(payment.dateTime).toLocaleString("ru-RU")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {teacher.individualPayments.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Оплаты индивидуальных занятий</p>
              <ul className="divide-y divide-slate-100 text-sm">
                {teacher.individualPayments.map((payment, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-slate-700">
                      {payment.studentName}
                      {payment.subject ? <span className="text-slate-400"> ({payment.subject})</span> : null}
                    </span>
                    <span className="text-right text-slate-500">
                      {payment.amount} · {payment.paymentMethod ? (METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod) : "—"}
                      <br />
                      {payment.dateTime ? new Date(payment.dateTime).toLocaleString("ru-RU") : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
          <TeacherRow key={teacher.teacherId} teacher={teacher} />
        ))}
        {data?.length === 0 && <p className="text-slate-500">Платежей за этот месяц нет</p>}
      </div>
    </div>
  );
}
