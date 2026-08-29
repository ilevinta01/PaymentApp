import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Role } from "@oplata/shared";
import { getGroups } from "../../api/groups";
import { useBasePath } from "../../hooks/useBasePath";
import { useAuthStore } from "../../store/auth.store";

export default function GroupsListPage() {
  const basePath = useBasePath();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const { data: groups, isLoading } = useQuery({ queryKey: ["groups"], queryFn: getGroups });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Группы</h2>
        {isAdmin && (
          <Link to="/admin/groups/manage" className="text-sm font-medium text-[var(--brand-primary)]">
            Добавить / Изменить
          </Link>
        )}
      </div>
      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {groups?.map((group) => (
          <li key={group.id}>
            <Link
              to={`${basePath}/groups/${group.id}`}
              className="flex items-center justify-between gap-2 px-4 py-4 active:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{group.name}</span>
              <span className="text-sm text-slate-500">{group.monthlyPrice} / мес</span>
            </Link>
          </li>
        ))}
        {groups?.length === 0 && <li className="px-4 py-4 text-slate-500">Групп пока нет</li>}
      </ul>
    </div>
  );
}
