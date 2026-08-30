import { useQuery } from "@tanstack/react-query";
import { getDebtors } from "../../api/debtors";

export default function DebtorsPage() {
  const { data: groups, isLoading } = useQuery({ queryKey: ["debtors"], queryFn: getDebtors });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Должники</h2>
        <p className="text-sm text-slate-500">
          Ученики без оплаты за текущий месяц (кроме тех, у кого активен статус Болезнь/Отпуск/Перерыв),
          сгруппированные по группам.
        </p>
      </div>
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      {groups?.length === 0 && <p className="text-slate-500">Должников нет</p>}
      <div className="space-y-4">
        {groups?.map((group) => (
          <div key={group.groupId} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
              <p className="font-semibold text-slate-800">{group.groupName}</p>
              <span className="text-sm text-slate-500">{group.students.length} чел.</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {group.students.map((student) => (
                <li key={student.id} className="px-4 py-3 text-slate-800">
                  {student.fullName}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
