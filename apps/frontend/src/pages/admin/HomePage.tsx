import BigButton from "../../components/BigButton";

export default function HomePage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <BigButton to="/admin/groups" label="Группы" />
      <BigButton to="/admin/search" label="Ученики" hint="поиск и добавление" />
      <BigButton to="/admin/reports" label="Отчёты" />
      <BigButton to="/admin/staff" label="Сотрудники" />
      <div className="col-span-2">
        <BigButton to="/admin/settings" label="Настройки" />
      </div>
    </div>
  );
}
