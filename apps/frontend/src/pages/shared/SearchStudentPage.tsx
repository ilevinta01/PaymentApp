import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Role } from "@oplata/shared";
import { getStudents } from "../../api/students";
import { useBasePath } from "../../hooks/useBasePath";
import { useAuthStore } from "../../store/auth.store";

export default function SearchStudentPage() {
  const basePath = useBasePath();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const { data: students, isFetching } = useQuery({
    queryKey: ["students-search", trimmed],
    queryFn: () => getStudents({ search: trimmed }),
    enabled: trimmed.length >= 2,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Ученики</h2>
        {isAdmin && (
          <Link to="/admin/students/new" className="text-sm font-medium text-[var(--brand-primary)]">
            + Добавить ученика
          </Link>
        )}
      </div>
      <input
        autoFocus
        placeholder="Введите имя или фамилию…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
      />
      {trimmed.length >= 2 && isFetching && <p className="text-slate-500">Ищем…</p>}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students?.map((student) => (
          <li key={student.id}>
            <Link
              to={`${basePath}/students/${student.id}`}
              className="flex items-center justify-between gap-2 px-4 py-4 active:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{student.fullName}</span>
              <span className="text-sm text-slate-500">{student.group?.name}</span>
            </Link>
          </li>
        ))}
        {trimmed.length >= 2 && students?.length === 0 && !isFetching && (
          <li className="px-4 py-4 text-slate-500">Ничего не найдено</li>
        )}
      </ul>
    </div>
  );
}
