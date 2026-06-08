import { Metadata } from "next"
import { FixedBillsList } from "@/components/fixed-bills/fixed-bills-list"

export const metadata: Metadata = {
  title: "Contas Fixas | Finança",
  description: "Gerencie suas contas fixas e despesas recorrentes",
}

export default function ContasFixasPage() {
  return (
    <main className="flex-1 p-4 lg:p-8 overflow-auto">
      <FixedBillsList />
    </main>
  )
}