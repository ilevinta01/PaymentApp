import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Role, StudentStatus } from "@oplata/shared";
import { deleteGroup, getGroups, setGroupTeachers, updateGroup } from "../../api/groups";
import { getStudents, updateStudent } from "../../api/students";
import { getStaff } from "../../api/users";
import { useBasePath } from "../../hooks/useBasePath";
import { useAuthStore } from "../../store/auth.store";
import GroupScheduleEditor from "../../components/GroupScheduleEditor";

const STATUS_LABELS: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "Активен",
  [StudentStatus.SICK]: "Болезнь",
  [StudentStatus.VACATION]: "Отпуск",
  [StudentStatus.PAUSE]: "Перерыв",
};

function StudentRow({
  student,
  groups,
  basePath,
  onChanged,
}: {
  student: { id: string; fullName: string; groupId: string; isPaidCurrentMonth?: boolean; status: StudentStatus };
  groups: { id: string; name: string }[];
  basePath: string;
  onChanged: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState("");

  const moveMutation = useMutation({
    mutationFn: () => updateStudent(student.id, { groupId: targetGroupId }),
    onSuccess: () => {
      setMoving(false);
      onChanged();
    },
  });

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <Link to={`${basePath}/students/${student.id}`} className="flex-1 font-medium text-slate-800">
          {student.fullName}
        </Link>
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
        <button onClick={() => setMoving((v) => !v)} className="text-sm font-medium text-[var(--brand-primary)]">
          Перевести
        </button>
      </div>
      {moving && (
        <div className="mt-2 flex items-center gap-2">
          <select
            value={targetGroupId}
            onChange={(e) => setTargetGroupId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">В какую группу?</option>
            {groups
              .filter((g) => g.id !== student.groupId)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
          <button
            onClick={() => moveMutation.mutate()}
            disabled={!targetGroupId || moveMutation.isPending}
            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Готово
          </button>
        </div>
      )}
      {moveMutation.isError && <p className="mt-1 text-sm text-red-600">Не удалось перевести ученика.</p>}
    </li>
  );
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role) === Role.SUPER_ADMIN;

  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: getGroups });
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: getStaff, enabled: isAdmin });
  const { data: students, isLoading } = useQuery({
    queryKey: ["students", { groupId }],
    queryFn: () => getStudents({ groupId }),
    enabled: !!groupId,
  });

  const group = groups?.find((g) => g.id === groupId);
  const teachers = staff?.filter((s) => s.role === Role.TEACHER) ?? [];

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [teacherIds, setTeacherIds] = useState<string[]>([]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setPrice(group.monthlyPrice);
      setTeacherIds(group.teachers?.map((t) => t.id) ?? []);
    }
  }, [group]);

  const invalidateGroups = () => queryClient.invalidateQueries({ queryKey: ["groups"] });
  const invalidateStudents = () => queryClient.invalidateQueries({ queryKey: ["students", { groupId }] });

  const saveMutation = useMutation({
    mutationFn: () => updateGroup(groupId!, { name, monthlyPrice: Number(price) }),
    onSuccess: invalidateGroups,
  });

  const teachersMutation = useMutation({
    mutationFn: () => setGroupTeachers(groupId!, teacherIds),
    onSuccess: invalidateGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId!),
    onSuccess: () => navigate(`${basePath}/groups`),
  });

  if (!group) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{group.name}</h2>
        {isAdmin && (
          <Link to={`/admin/students/new?groupId=${groupId}`} className="text-sm font-medium text-[var(--brand-primary)]">
            + Добавить ученика
          </Link>
        )}
      </div>

      {isAdmin ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !name.trim()}
              className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Сохранить
            </button>
          </div>
          {saveMutation.isError && <p className="text-sm text-red-600">Не удалось сохранить изменения.</p>}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Преподаватели</p>
            <div className="flex flex-wrap gap-2">
              {teachers.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                    teacherIds.includes(t.id)
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary-dark)]"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={teacherIds.includes(t.id)}
                    onChange={() =>
                      setTeacherIds((ids) =>
                        ids.includes(t.id) ? ids.filter((id) => id !== t.id) : [...ids, t.id],
                      )
                    }
                    className="h-3.5 w-3.5"
                  />
                  {t.fullName}
                </label>
              ))}
              {teachers.length === 0 && <p className="text-sm text-slate-400">Преподавателей пока нет</p>}
            </div>
            <button
              onClick={() => teachersMutation.mutate()}
              disabled={teachersMutation.isPending}
              className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Сохранить преподавателей
            </button>
          </div>

          <GroupScheduleEditor group={group} onChanged={invalidateGroups} />

          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => {
                if (confirm(`Удалить группу «${group.name}»?`)) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="text-sm font-medium text-red-600"
            >
              Удалить группу
            </button>
            {deleteMutation.isError && (
              <p className="mt-1 text-sm text-red-600">
                Не удалось удалить группу — возможно, в ней ещё остались ученики.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{group.monthlyPrice} / мес</p>
      )}

      {isLoading && <p className="text-slate-500">Загрузка…</p>}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students?.map((student) =>
          isAdmin ? (
            <StudentRow
              key={student.id}
              student={student}
              groups={groups ?? []}
              basePath={basePath}
              onChanged={invalidateStudents}
            />
          ) : (
            <li key={student.id}>
              <Link
                to={`${basePath}/students/${student.id}`}
                className="flex items-center justify-between gap-2 px-4 py-4 active:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{student.fullName}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    student.isPaidCurrentMonth ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {student.isPaidCurrentMonth ? "Оплачено" : "Не оплачено"}
                </span>
              </Link>
            </li>
          ),
        )}
        {students?.length === 0 && <li className="px-4 py-4 text-slate-500">В группе пока нет учеников</li>}
      </ul>
    </div>
  );
}
