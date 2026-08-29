import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupDto } from "@oplata/shared";
import { createGroup, getGroups, updateGroup } from "../../api/groups";

function EditableGroupRow({ group, onChanged }: { group: GroupDto; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [price, setPrice] = useState(group.monthlyPrice);

  const mutation = useMutation({
    mutationFn: () => updateGroup(group.id, { name, monthlyPrice: Number(price) }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-slate-800">{group.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">{group.monthlyPrice} / мес</span>
          <button
            onClick={() => {
              setName(group.name);
              setPrice(group.monthlyPrice);
              setEditing(true);
            }}
            className="text-sm font-medium text-[var(--brand-primary)]"
          >
            Изменить
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim()}
          className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Сохраняем…" : "Сохранить"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          Отмена
        </button>
      </div>
      {mutation.isError && <p className="text-sm text-red-600">Не удалось сохранить изменения.</p>}
    </li>
  );
}

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: getGroups });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const invalidateGroups = () => queryClient.invalidateQueries({ queryKey: ["groups"] });

  const mutation = useMutation({
    mutationFn: () => createGroup({ name, monthlyPrice: Number(price) }),
    onSuccess: () => {
      invalidateGroups();
      setName("");
      setPrice("");
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Группы</h2>
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
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          placeholder="Цена/мес"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="w-32 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 font-medium text-white">Добавить</button>
      </form>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {groups?.map((group) => (
          <EditableGroupRow key={group.id} group={group} onChanged={invalidateGroups} />
        ))}
        {groups?.length === 0 && <li className="px-4 py-3 text-slate-500">Группы пока не созданы</li>}
      </ul>
    </div>
  );
}
