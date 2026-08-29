import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupDto, Role, UserDto } from "@oplata/shared";
import { createStaff, getStaff, setStaffActive, updateStaff } from "../../api/users";
import { getGroups } from "../../api/groups";
import { getTenantSettings } from "../../api/tenantSettings";
import TelegramChatPicker from "../../components/TelegramChatPicker";

function GroupCheckboxes({
  groups,
  selected,
  onChange,
}: {
  groups: GroupDto[];
  selected: string[];
  onChange: (groupIds: string[]) => void;
}) {
  const toggle = (groupId: string) => {
    onChange(selected.includes(groupId) ? selected.filter((id) => id !== groupId) : [...selected, groupId]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <label
          key={group.id}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
            selected.includes(group.id)
              ? "border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary-dark)]"
              : "border-slate-300 text-slate-600"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(group.id)}
            onChange={() => toggle(group.id)}
            className="h-3.5 w-3.5"
          />
          {group.name}
        </label>
      ))}
      {groups.length === 0 && <p className="text-sm text-slate-500">Групп пока нет</p>}
    </div>
  );
}

function StaffRow({
  member,
  groups,
  showIndividualLessonRate,
  onChanged,
}: {
  member: UserDto;
  groups: GroupDto[];
  showIndividualLessonRate: boolean;
  onChanged: () => void;
}) {
  const [editingGroups, setEditingGroups] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>(member.groupIds ?? []);
  const [rate, setRate] = useState(member.individualLessonRate ?? "");

  const groupsMutation = useMutation({
    mutationFn: () => updateStaff(member.id, { groupIds }),
    onSuccess: () => {
      setEditingGroups(false);
      onChanged();
    },
  });

  const activeMutation = useMutation({
    mutationFn: () => setStaffActive(member.id, !member.isActive),
    onSuccess: onChanged,
  });

  const rateMutation = useMutation({
    mutationFn: () => updateStaff(member.id, { individualLessonRate: Number(rate) }),
    onSuccess: onChanged,
  });

  const telegramMutation = useMutation({
    mutationFn: (telegramChatId: string) => updateStaff(member.id, { telegramChatId }),
    onSuccess: onChanged,
  });

  const assignedNames = groups.filter((g) => (member.groupIds ?? []).includes(g.id)).map((g) => g.name);

  return (
    <li className="space-y-2 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-800">{member.fullName}</p>
          <p className="text-sm text-slate-500">{member.email}</p>
          {member.phone && <p className="text-sm text-slate-500">{member.phone}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-slate-500">
            {member.role === Role.SUPER_ADMIN ? "Супер-Админ" : "Преподаватель"}
          </span>
          <button
            onClick={() => activeMutation.mutate()}
            className={`text-xs font-medium ${member.isActive ? "text-red-600" : "text-emerald-600"}`}
          >
            {member.isActive ? "Деактивировать" : "Активировать"}
          </button>
        </div>
      </div>

      {member.role === Role.TEACHER && (
        <div className="space-y-2">
          {!editingGroups ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                {assignedNames.length > 0 ? `Группы: ${assignedNames.join(", ")}` : "Группы не назначены"}
              </p>
              <button
                onClick={() => setEditingGroups(true)}
                className="text-sm font-medium text-[var(--brand-primary)]"
              >
                Изменить
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <GroupCheckboxes groups={groups} selected={groupIds} onChange={setGroupIds} />
              <div className="flex gap-2">
                <button
                  onClick={() => groupsMutation.mutate()}
                  disabled={groupsMutation.isPending}
                  className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setGroupIds(member.groupIds ?? []);
                    setEditingGroups(false);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {showIndividualLessonRate && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
              <label className="text-sm text-slate-600">Ставка за индивидуальное (в час):</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                onClick={() => rateMutation.mutate()}
                disabled={rateMutation.isPending}
                className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                Сохранить
              </button>
              {member.telegramChatId ? (
                <span className="text-sm text-emerald-600">Telegram привязан</span>
              ) : (
                <TelegramChatPicker onSelect={(chatId) => telegramMutation.mutate(chatId)} />
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: getGroups });
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(Role.TEACHER);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const invalidateStaff = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const mutation = useMutation({
    mutationFn: () =>
      createStaff({ email, password, fullName, phone: phone || undefined, role, groupIds }),
    onSuccess: () => {
      invalidateStaff();
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setRole(Role.TEACHER);
      setGroupIds([]);
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Сотрудники</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="ФИО"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value={Role.TEACHER}>Преподаватель</option>
            <option value={Role.SUPER_ADMIN}>Супер-Админ</option>
          </select>
        </div>
        {role === Role.TEACHER && (
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Допуск к группам</p>
            <GroupCheckboxes groups={groups ?? []} selected={groupIds} onChange={setGroupIds} />
          </div>
        )}
        <button
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 font-medium text-white disabled:opacity-60 sm:w-auto sm:px-4"
        >
          {mutation.isPending ? "Сохраняем…" : "Добавить сотрудника"}
        </button>
        {mutation.isError && <p className="text-sm text-red-600">Не удалось добавить сотрудника.</p>}
      </form>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {staff?.map((member) => (
          <StaffRow
            key={member.id}
            member={member}
            groups={groups ?? []}
            showIndividualLessonRate={!!settings?.isIndividualLessonsEnabled}
            onChanged={invalidateStaff}
          />
        ))}
        {staff?.length === 0 && <li className="px-4 py-4 text-slate-500">Сотрудников пока нет</li>}
      </ul>
    </div>
  );
}
