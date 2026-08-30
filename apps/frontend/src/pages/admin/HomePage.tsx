import BigButton from "../../components/BigButton";
import { useBranding } from "../../hooks/useBranding";

export default function HomePage() {
  const settings = useBranding();

  return (
    <div className="space-y-4">
      {settings?.logoUrl && (
        <div className="flex justify-center rounded-2xl bg-white p-4 shadow-sm">
          <img src={settings.logoUrl} alt="Логотип" className="max-h-20 object-contain" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <BigButton to="/admin/groups" label="Группы" />
        <BigButton to="/admin/search" label="Ученики" hint="поиск и добавление" />
        <BigButton to="/admin/reports" label="Отчёты" />
        <BigButton to="/admin/staff" label="Сотрудники" />
        {settings?.isIndividualLessonsEnabled && (
          <BigButton to="/admin/individual-lessons" label="Индивидуальные занятия" />
        )}
        {settings?.isScheduleEnabled && <BigButton to="/admin/schedule" label="Расписание" />}
        <div className="col-span-2">
          <BigButton to="/admin/settings" label="Настройки" />
        </div>
      </div>
    </div>
  );
}
