import { useQuery } from "@tanstack/react-query";
import { PaymentMethod } from "@oplata/shared";
import { getPaymentLogs } from "../../api/paymentLogs";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Наличные",
  [PaymentMethod.CARD]: "Карта",
};

export default function PaymentLogsPage() {
  const { data: logs, isLoading } = useQuery({ queryKey: ["payment-logs"], queryFn: getPaymentLogs });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Реестр изменений</h2>
        <p className="text-sm text-slate-500">История ручных корректировок платежей с указанием причины.</p>
      </div>
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
        {logs?.map((log) => (
          <li key={log.id} className="px-4 py-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-800">{log.student.fullName}</span>
              <span className="text-sm text-slate-400">{new Date(log.editDate).toLocaleString("ru-RU")}</span>
            </div>
            <p className="text-sm text-slate-600">
              {log.oldAmount} ({METHOD_LABEL[log.oldMethod]}) → {log.newAmount} ({METHOD_LABEL[log.newMethod]})
            </p>
            <p className="text-sm text-slate-500">
              Причина: {log.reason} · Изменил: {log.editedBy.fullName}
            </p>
          </li>
        ))}
        {logs?.length === 0 && <li className="px-4 py-3 text-slate-500">Изменений пока не было</li>}
      </ul>
    </div>
  );
}
