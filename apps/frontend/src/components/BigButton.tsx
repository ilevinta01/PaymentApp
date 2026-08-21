import { Link } from "react-router-dom";

export default function BigButton({ to, label, hint }: { to: string; label: string; hint?: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-2xl bg-indigo-600 p-5 text-center font-semibold text-white shadow-sm transition-transform active:scale-[0.97]"
    >
      <span className="text-lg">{label}</span>
      {hint && <span className="text-xs font-normal text-indigo-100">{hint}</span>}
    </Link>
  );
}
