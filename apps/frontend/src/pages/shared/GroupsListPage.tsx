import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Role } from "@oplata/shared";
import { createGroup, getGroups } from "../../api/groups";
import { useBasePath } from "../../hooks/useBasePath";
import { useAuthStore } from "../../store/auth.store";

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const mutation = useMutation({
    mutationFn: () => createGroup({ name, monthlyPrice: Number(price) }),
    onSuccess: () => {
      onCreated();
      setName("");
      setPrice("");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4"
    >
      <input
        placeholder="Название группы"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
      />
      <input
        placeholder="Цена/мес"
        type="number"
        min={0}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
        className="w-28 rounded-lg border border-slate-300 px-3 py-2"
      />
      <button
        disabled={mutation.isPending}
        className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        Добавить
      </button>
      {mutation.isError && <p className="w-full text-sm text-red-600">Не удалось создать группу.</p>}
    </form>
  );
}

export default function GroupsListPage() {
  const basePath = useBasePath();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;
  const queryClient = useQueryClient();
  const { data: groups, isLoading } = useQuery({ queryKey: ["groups"], queryFn: getGroups });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Группы</h2>
      {isAdmin && (
        <CreateGroupForm onCreated={() => queryClient.invalidateQueries({ queryKey: ["groups"] })} />
      )}
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
      {isAdmin && <p className="text-xs text-slate-400">Откройте группу, чтобы изменить цену, преподавателей, расписание или перевести учеников.</p>}
    </div>
  );
}
