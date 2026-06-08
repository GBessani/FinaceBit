import { Metadata } from "next"
import { ScheduledList } from "@/components/scheduled/scheduled-list"

export const metadata: Metadata = {
  title: "Lançamentos Futuros | Finança",
  description: "Agende receitas e despesas para datas futuras",
}

export default function LancamentosFuturosPage() {
  return (
    <main className="flex-1 p-4 lg:p-8 overflow-auto">
      <ScheduledList />
    </main>
  )
}