import { useQuery } from "@tanstack/react-query";
import { getDebtors } from "../../api/debtors";

export default function DebtorsPage() {
  const { data: debtors, isLoading } = useQuery({ queryKey: ["debtors"], queryFn: getDebtors });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Должники</h2>
        <p className="text-sm text-slate-500">
          Ученики без оплаты за текущий месяц (кроме тех, у кого активен статус Болезнь/Отпуск/Перерыв).
        </p>
      </div>
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
        {debtors?.map((student) => (
          <li key={student.id} className="flex justify-between px-4 py-3">
            <span className="text-slate-800">{student.fullName}</span>
            <span className="text-sm text-slate-500">{student.group?.name}</span>
          </li>
        ))}
        {debtors?.length === 0 && <li className="px-4 py-3 text-slate-500">Должников нет</li>}
      </ul>
    </div>
  );
}
