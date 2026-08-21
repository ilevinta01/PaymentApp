// Последние N календарных месяцев (включая текущий) для выбора периода в отчётах —
// отчёты в системе доступны за последние 6 месяцев.
export function getLastMonths(count = 6): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    months.push({ value, label });
  }

  return months;
}
