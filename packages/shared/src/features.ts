export type FeatureKey =
  | "isCardEnabled"
  | "isTelegramEnabled"
  | "isCashCollectionEnabled"
  | "isTeacherEarningsEnabled"
  | "isIndividualLessonsEnabled"
  | "isScheduleEnabled"
  | "isPaymentsReportEnabled"
  | "isDebtorsReportEnabled"
  | "isIndividualDebtorsReportEnabled"
  | "isChangeLogEnabled";

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
  {
    key: "isIndividualLessonsEnabled",
    label: "Индивидуальные занятия",
    description:
      "Создание индивидуальных занятий на одного или нескольких учеников с уведомлением учителя и родителей и раздельным учётом оплаты.",
  },
  {
    key: "isScheduleEnabled",
    label: "Расписание",
    description:
      "Еженедельное расписание групп у администратора и просмотр своего расписания преподавателем по неделям (включая индивидуальные занятия).",
  },
  {
    key: "isPaymentsReportEnabled",
    label: "Отчёт по оплатам",
    description: "Визуализация собранных оплат по группам за период и выгрузка отчёта в Excel по группам.",
  },
  {
    key: "isDebtorsReportEnabled",
    label: "Отчёт по должникам",
    description: "Список должников по групповым занятиям, сгруппированный по группам.",
  },
  {
    key: "isIndividualDebtorsReportEnabled",
    label: "Должники по индивидуальным занятиям",
    description: "Отдельный отчёт о неоплаченных индивидуальных занятиях, сгруппированный по преподавателям.",
  },
  {
    key: "isChangeLogEnabled",
    label: "Реестр изменений",
    description:
      "Журнал операций (оплаты, изменения оплат, отмены индивидуальных занятий) с указанием, кто и когда внёс изменение.",
  },
];

export interface FeaturePriceDto {
  key: FeatureKey;
  label: string;
  description: string;
  price: number;
}
