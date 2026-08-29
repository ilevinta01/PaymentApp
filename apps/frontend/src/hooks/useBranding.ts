import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTenantSettings } from "../api/tenantSettings";

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount);
  const b = Math.min(255, (num & 0xff) + (255 - (num & 0xff)) * amount);
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

// Применяет фирменный цвет школы (если задан в настройках тенанта) ко всему интерфейсу
// через CSS-переменные — без него используется цвет по умолчанию из index.css.
export function useBranding() {
  const { data } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });

  useEffect(() => {
    const root = document.documentElement.style;
    if (data?.primaryColor) {
      root.setProperty("--brand-primary", data.primaryColor);
      root.setProperty("--brand-primary-dark", darken(data.primaryColor, 0.15));
      root.setProperty("--brand-primary-light", lighten(data.primaryColor, 0.85));
    } else {
      root.removeProperty("--brand-primary");
      root.removeProperty("--brand-primary-dark");
      root.removeProperty("--brand-primary-light");
    }
  }, [data?.primaryColor]);

  return data;
}
