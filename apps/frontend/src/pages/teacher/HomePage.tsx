import BigButton from "../../components/BigButton";

export default function HomePage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <BigButton to="/teacher/groups" label="Группы" />
      <BigButton to="/teacher/search" label="Поиск ученика" />
    </div>
  );
}
