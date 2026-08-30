import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChangeLogCategory } from "@oplata/shared";
import { getChangeLog } from "../../api/reports";
import { getStaff } from "../../api/users";

const CATEGORY_LABELS: Record<ChangeLogCategory, string> = {
  PAYMENT_EDITED: "Оплата изменена",
  INDIVIDUAL_PAID: "Оплата индивидуального занятия",
  INDIVIDUAL_CANCELLED: "Отмена индивидуального занятия",
};

const CATEGORY_COLORS: Record<ChangeLogCategory, string> = {
  PAYMENT_EDITED: "bg-amber-100 text-amber-700",
  INDIVIDUAL_PAID: "bg-emerald-100 text-emerald-700",
  INDIVIDUAL_CANCELLED: "bg-red-100 text-red-700",
};

export default function ChangeLogPage() {
  const [category, setCategory] = useState<ChangeLogCategory | "">("");
  const [actorId, setActorId] = useState("");
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff });
  const { data: logs, isLoading } = useQuery({
    queryKey: ["change-log", category, actorId],
    queryFn: () => getChangeLog({ category: category || undefined, actorId: actorId || undefined }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Реестр изменений</h2>
        <p className="text-sm text-slate-500">
          Оплаты, изменения оплат и отмены индивидуальных занятий с указанием, кто и когда внёс изменение.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ChangeLogCategory | "")}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Все категории</option>
          {(Object.keys(CATEGORY_LABELS) as ChangeLogCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Все сотрудники</option>
          {staff?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {logs?.map((log) => (
          <li key={log.id} className="space-y-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[log.category]}`}>
                {CATEGORY_LABELS[log.category]}
              </span>
              <span className="text-sm text-slate-400">{new Date(log.date).toLocaleString("ru-RU")}</span>
            </div>
            <p className="text-sm text-slate-700">{log.description}</p>
            <p className="text-sm text-slate-500">
              Ученик: {log.studentName} · Внёс: {log.actorName}
            </p>
          </li>
        ))}
        {logs?.length === 0 && <li className="px-4 py-3 text-slate-500">Изменений пока не было</li>}
      </ul>
    </div>
  );
}
