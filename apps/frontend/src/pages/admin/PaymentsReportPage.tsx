import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { exportPaymentsByGroup, getPaymentsByGroup } from "../../api/reports";
import { getLastMonths } from "../../utils/months";

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function PaymentsReportPage() {
  const months = getLastMonths(6);
  const [periodMonth, setPeriodMonth] = useState(months[0].value);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data: groups, isLoading } = useQuery({
    queryKey: ["payments-by-group", periodMonth],
    queryFn: () => getPaymentsByGroup(periodMonth),
  });

  const handleDownload = async (groupId?: string, label?: string) => {
    setDownloadingId(groupId ?? "all");
    try {
      const blob = await exportPaymentsByGroup(periodMonth, groupId);
      downloadBlob(blob, `оплаты-${label ?? "все-группы"}-${periodMonth}.xlsx`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Отчёт по оплатам</h2>
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

      <button
        onClick={() => handleDownload()}
        disabled={downloadingId === "all"}
        className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {downloadingId === "all" ? "Формируем…" : "Скачать Excel (все группы)"}
      </button>

      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      {groups?.length === 0 && <p className="text-slate-500">Оплат за этот месяц нет</p>}

      <div className="space-y-4">
        {groups?.map((group) => (
          <div key={group.groupId} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2">
              <div>
                <p className="font-semibold text-slate-800">{group.groupName}</p>
                <p className="text-sm text-slate-500">
                  Собрано: {group.totalCollected} (нал. {group.cashTotal} · карта {group.cardTotal}) ·{" "}
                  {group.paymentsCount} платежей
                </p>
              </div>
              <button
                onClick={() => handleDownload(group.groupId, group.groupName)}
                disabled={downloadingId === group.groupId}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-60"
              >
                {downloadingId === group.groupId ? "Формируем…" : "Скачать Excel"}
              </button>
            </div>
            <ul className="divide-y divide-slate-200">
              {group.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="text-slate-700">{p.studentName}</span>
                  <span className="text-slate-500">
                    {p.amount} · {p.paymentMethod === "CASH" ? "Наличные" : "Карта"} ·{" "}
                    {new Date(p.dateTime).toLocaleString("ru-RU")}
                  </span>
                </li>
              ))}
              {group.payments.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">Оплат нет</li>}
            </ul>
            {group.deposits.length > 0 && (
              <div className="border-t border-slate-100 bg-amber-50/40 px-4 py-2">
                <p className="text-xs font-medium text-amber-700">
                  Пополнения баланса за месяц: {group.depositsTotal}
                </p>
                <ul className="mt-1 space-y-1">
                  {group.deposits.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-700">{d.studentName}</span>
                      <span className="text-slate-500">
                        {d.amount} · {d.paymentMethod === "CASH" ? "Наличные" : "Карта"} ·{" "}
                        {new Date(d.dateTime).toLocaleString("ru-RU")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
