import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getReportSummary } from "../../api/reports";
import { getTenantSettings } from "../../api/tenantSettings";
import { getLastMonths } from "../../utils/months";

const LINKS = [
  { to: "/admin/reports/payments", label: "Оплаты (список и редактирование)" },
  {
    to: "/admin/reports/payments-report",
    label: "Отчёт по оплатам (по группам)",
    feature: "isPaymentsReportEnabled" as const,
  },
  { to: "/admin/reports/debtors", label: "Должники", feature: "isDebtorsReportEnabled" as const },
  {
    to: "/admin/reports/individual-debtors",
    label: "Должники по индивидуальным",
    feature: "isIndividualDebtorsReportEnabled" as const,
  },
  { to: "/admin/reports/change-log", label: "Реестр изменений", feature: "isChangeLogEnabled" as const },
  { to: "/admin/reports/teacher-earnings", label: "По преподавателям", feature: "isTeacherEarningsEnabled" as const },
  { to: "/admin/reports/cash-collections", label: "Касса (инкассация)", feature: "isCashCollectionEnabled" as const },
];

export default function ReportsPage() {
  const months = getLastMonths(6);
  const [periodMonth, setPeriodMonth] = useState(months[0].value);
  const { data, isLoading } = useQuery({
    queryKey: ["reports-summary", periodMonth],
    queryFn: () => getReportSummary(periodMonth),
  });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });

  const links = LINKS.filter((link) => !link.feature || settings?.[link.feature]);

  const stats = data
    ? [
        { label: "Собрано за месяц", value: data.totalCollected },
        { label: "Наличными", value: data.cashTotal },
        { label: "Картой", value: data.cardTotal },
        { label: "Платежей", value: data.paymentsCount },
        { label: "Учеников всего", value: data.studentsCount },
        { label: "Должников", value: data.debtorsCount },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Отчёты</h2>
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
      {data && (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="block px-4 py-4 text-slate-800 active:bg-slate-50">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
