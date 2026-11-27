import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConsentStatus } from "@oplata/shared";
import { getTelegramChats, getTenantSettings } from "../api/tenantSettings";

const CONSENT_LABEL: Record<ConsentStatus, { text: string; className: string }> = {
  ACCEPTED: { text: "согласие получено", className: "text-emerald-600" },
  PENDING: { text: "ещё не подтвердил согласие", className: "text-amber-600" },
  REVOKED: { text: "согласие отозвано", className: "text-red-600" },
};

// Помогает привязать родителя без ручного поиска chat_id: показывает всех, кто написал боту центра
// (/start), и даёт выбрать одним кликом. Рядом видно, принял ли человек политику конфиденциальности.
export default function TelegramChatPicker({
  onSelect,
  label = "Найти чат родителя",
  emptyHint = "Пока никто не писал боту. Попросите родителя найти бота и отправить ему /start, затем нажмите ещё раз.",
}: {
  onSelect: (chatId: string) => void;
  label?: string;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["tenant-settings"], queryFn: getTenantSettings });
  const { data: chats, isFetching, isError, refetch } = useQuery({
    queryKey: ["telegram-chats"],
    queryFn: getTelegramChats,
    enabled: false,
    retry: false,
  });

  if (!settings?.isTelegramEnabled) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          refetch();
        }}
        className="text-sm font-medium text-[var(--brand-primary)]"
      >
        {label}
      </button>
      {open && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
          {isFetching && <p className="text-slate-500">Загружаем список…</p>}
          {isError && <p className="text-red-600">Не удалось получить список. Попробуйте ещё раз.</p>}
          {!isFetching && !isError && chats?.length === 0 && (
            <p className="text-slate-500">
              {emptyHint}
            </p>
          )}
          {!isFetching && chats && chats.length > 0 && (
            <ul className="divide-y divide-slate-200">
              {chats.map((chat) => (
                <li key={chat.chatId}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(chat.chatId);
                      setOpen(false);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-2 py-2 text-left active:bg-slate-100"
                  >
                    <span className="text-slate-800">
                      {chat.name}
                      {chat.username ? ` (@${chat.username})` : ""}
                    </span>
                    <span className={`text-xs ${CONSENT_LABEL[chat.consentStatus].className}`}>
                      {CONSENT_LABEL[chat.consentStatus].text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
