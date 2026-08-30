export function getCurrentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function nextPeriodMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split("-").map(Number);
  const d = new Date(year, month, 1); // month is 1-based input -> already +1 in Date's 0-based scale
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
