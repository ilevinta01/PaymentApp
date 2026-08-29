export type FeatureKey = "isCardEnabled" | "isTelegramEnabled" | "isCashCollectionEnabled" | "isTeacherEarningsEnabled";

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
}

// Единый список платных функций платформы — используется и на бэкенде (описания),
// и на фронтенде (панель владельца платформы), чтобы не дублировать тексты в двух местах.
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: "isCardEnabled",
    label: "Оплата картой",
    description: "Разрешает фиксировать оплату безналичным способом, а не только наличными.",
  },
  {
    key: "isTelegramEnabled",
    label: "Telegram-чеки",
    description: "Автоматическая отправка чека родителю в Telegram сразу после фиксации оплаты.",
  },
  {
    key: "isCashCollectionEnabled",
    label: "Касса (инкассация)",
    description: "Учёт наличных у преподавателей и их сдача администратору.",
  },
  {
    key: "isTeacherEarningsEnabled",
    label: "Отчёт по заработку преподавателей",
    description: "Отчёт о том, кто из преподавателей собрал сколько денег и когда.",
  },
];

export interface FeaturePriceDto {
  key: FeatureKey;
  label: string;
  description: string;
  price: number;
}
