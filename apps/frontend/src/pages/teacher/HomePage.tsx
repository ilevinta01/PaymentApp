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
        <BigButton to="/teacher/groups" label="Группы" />
        <BigButton to="/teacher/search" label="Поиск ученика" />
      </div>
    </div>
  );
}
