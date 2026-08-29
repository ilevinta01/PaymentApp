import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Role, StudentStatus } from "@oplata/shared";
import { getGroups } from "../../api/groups";
import { getStudents } from "../../api/students";
import { useBasePath } from "../../hooks/useBasePath";
import { useAuthStore } from "../../store/auth.store";

const STATUS_LABELS: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "Активен",
  [StudentStatus.SICK]: "Болезнь",
  [StudentStatus.VACATION]: "Отпуск",
  [StudentStatus.PAUSE]: "Перерыв",
};

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const basePath = useBasePath();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: getGroups });
  const { data: students, isLoading } = useQuery({
    queryKey: ["students", { groupId }],
    queryFn: () => getStudents({ groupId }),
    enabled: !!groupId,
  });

  const group = groups?.find((g) => g.id === groupId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{group?.name ?? "Группа"}</h2>
          {group && <p className="text-sm text-slate-500">{group.monthlyPrice} / мес</p>}
        </div>
        {isAdmin && groupId && (
          <Link to={`/admin/students/new?groupId=${groupId}`} className="text-sm font-medium text-[var(--brand-primary)]">
            + Добавить ученика
          </Link>
        )}
      </div>
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students?.map((student) => (
          <li key={student.id}>
            <Link
              to={`${basePath}/students/${student.id}`}
              className="flex items-center justify-between gap-2 px-4 py-4 active:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{student.fullName}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    student.isPaidCurrentMonth ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {student.isPaidCurrentMonth ? "Оплачено" : "Не оплачено"}
                </span>
                {student.status !== StudentStatus.ACTIVE && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {STATUS_LABELS[student.status]}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
        {students?.length === 0 && <li className="px-4 py-4 text-slate-500">В группе пока нет учеников</li>}
      </ul>
    </div>
  );
}
