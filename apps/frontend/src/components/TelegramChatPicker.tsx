import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTelegramChats, getTenantSettings } from "../api/tenantSettings";

// Помогает найти numeric chat_id родителя без ручного копания в Telegram API:
// показывает тех, кто недавно написал что-то боту центра, и даёт выбрать одним кликом.
export default function TelegramChatPicker({ onSelect }: { onSelect: (chatId: string) => void }) {
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
        Найти чат родителя
      </button>
      {open && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
          {isFetching && <p className="text-slate-500">Ищем сообщения боту…</p>}
          {isError && (
            <p className="text-red-600">
              Не удалось получить чаты. Проверьте токен бота в Настройках.
            </p>
          )}
          {!isFetching && !isError && chats?.length === 0 && (
            <p className="text-slate-500">
              Пока никто не писал боту. Попросите родителя отправить боту любое сообщение и нажмите ещё раз.
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
                    {chat.lastMessage && <span className="truncate text-xs text-slate-500">«{chat.lastMessage}»</span>}
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
