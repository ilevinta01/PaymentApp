import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createStudent } from "../../api/students";
import { getGroups } from "../../api/groups";
import TelegramChatPicker from "../../components/TelegramChatPicker";

export default function AddStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetGroupId = searchParams.get("groupId") ?? "";
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: getGroups });

  const [form, setForm] = useState({
    fullName: "",
    groupId: presetGroupId,
    dateOfBirth: "",
    phone: "",
    parentFullName: "",
    parentPhone: "",
    parentTelegramChatId: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createStudent({
        fullName: form.fullName,
        groupId: form.groupId,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone || undefined,
        parentFullName: form.parentFullName || undefined,
        parentPhone: form.parentPhone || undefined,
        parentTelegramChatId: form.parentTelegramChatId || undefined,
      }),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate(`/admin/students/${student.id}`);
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Добавить ученика</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block text-sm">
          <span className="text-slate-600">ФИО ученика</span>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Группа</span>
          <select
            required
            value={form.groupId}
            onChange={(e) => setForm({ ...form, groupId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Выберите группу…</option>
            {groups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Дата рождения</span>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Телефон ученика (необязательно)</span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">ФИО родителя</span>
          <input
            value={form.parentFullName}
            onChange={(e) => setForm({ ...form, parentFullName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Телефон родителя</span>
          <input
            value={form.parentPhone}
            onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Telegram родителя (для чеков)</span>
          <input
            value={form.parentTelegramChatId}
            onChange={(e) => setForm({ ...form, parentTelegramChatId: e.target.value })}
            placeholder="chat_id"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <TelegramChatPicker onSelect={(chatId) => setForm({ ...form, parentTelegramChatId: chatId })} />
        <button
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Сохраняем…" : "Добавить ученика"}
        </button>
        {mutation.isError && <p className="text-sm text-red-600">Не удалось добавить ученика. Проверьте данные.</p>}
      </form>
    </div>
  );
}
