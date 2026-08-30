import { useQuery } from "@tanstack/react-query";
import { getIndividualDebtors } from "../../api/reports";

export default function IndividualDebtorsPage() {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ["individual-debtors"],
    queryFn: getIndividualDebtors,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Должники по индивидуальным занятиям</h2>
        <p className="text-sm text-slate-500">Неоплаченные индивидуальные занятия, сгруппированные по преподавателям.</p>
      </div>
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      {teachers?.length === 0 && <p className="text-slate-500">Должников нет</p>}
      <div className="space-y-4">
        {teachers?.map((teacher) => (
          <div key={teacher.teacherId} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
              <p className="font-semibold text-slate-800">{teacher.teacherName}</p>
              <span className="text-sm font-medium text-red-600">Должны: {teacher.totalOwed}</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {teacher.debtors.map((d) => (
                <li key={d.participantId} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="text-slate-800">{d.studentName}</p>
                    <p className="text-slate-500">
                      {new Date(d.lessonStartAt).toLocaleString("ru-RU")}
                      {d.subject ? ` · ${d.subject}` : ""}
                    </p>
                  </div>
                  <span className="font-medium text-slate-700">{d.shareAmount}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
