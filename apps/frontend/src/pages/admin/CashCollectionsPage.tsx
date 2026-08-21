import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCashCollection, getCashBalances, getCashCollections } from "../../api/cashCollections";

function CollectRow({
  teacherId,
  teacherName,
  balance,
  onCollected,
}: {
  teacherId: string;
  teacherName: string;
  balance: string;
  onCollected: () => void;
}) {
  const [amount, setAmount] = useState("");
  const hasBalance = Number(balance) > 0;

  const mutation = useMutation({
    mutationFn: (amountValue?: number) => createCashCollection({ teacherId, amount: amountValue }),
    onSuccess: () => {
      setAmount("");
      onCollected();
    },
  });

  return (
    <li className="space-y-2 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-800">{teacherName}</span>
        <span className={`text-sm font-semibold ${hasBalance ? "text-amber-600" : "text-slate-400"}`}>{balance}</span>
      </div>
      {hasBalance && (
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            min={0.01}
            step="0.01"
            placeholder={`Сумма (до ${balance})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-w-[140px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => mutation.mutate(amount ? Number(amount) : undefined)}
            disabled={mutation.isPending || !amount}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Изъять
          </button>
          <button
            onClick={() => mutation.mutate(undefined)}
            disabled={mutation.isPending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
          >
            Забрать всё
          </button>
        </div>
      )}
      {mutation.isError && <p className="text-sm text-red-600">Не удалось изъять сумму.</p>}
    </li>
  );
}

export default function CashCollectionsPage() {
  const queryClient = useQueryClient();
  const { data: balances } = useQuery({ queryKey: ["cash-balances"], queryFn: getCashBalances });
  const { data: history } = useQuery({ queryKey: ["cash-collections"], queryFn: getCashCollections });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cash-balances"] });
    queryClient.invalidateQueries({ queryKey: ["cash-collections"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Касса</h2>
        <p className="text-sm text-slate-500">
          Сколько наличных сейчас у каждого преподавателя и изъятие в кассу центра.
        </p>
      </div>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {balances?.map((balance) => (
          <CollectRow
            key={balance.teacherId}
            teacherId={balance.teacherId}
            teacherName={balance.teacherName}
            balance={balance.balance}
            onCollected={invalidate}
          />
        ))}
        {balances?.length === 0 && <li className="px-4 py-4 text-slate-500">Преподавателей пока нет</li>}
      </ul>

      <div>
        <h3 className="mb-2 font-semibold text-slate-900">История изъятий</h3>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {history?.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-800">{item.teacherName}</span>
                <span className="font-medium text-slate-900">{item.amount}</span>
              </div>
              <p className="text-slate-500">
                Изъял: {item.collectedByName} · {new Date(item.collectedAt).toLocaleString("ru-RU")}
              </p>
            </li>
          ))}
          {history?.length === 0 && <li className="px-4 py-4 text-slate-500">Изъятий пока не было</li>}
        </ul>
      </div>
    </div>
  );
}
