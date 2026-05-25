import { TransactionsList } from "@/components/transactions/transactions-list"

export default function TransacoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transações</h1>
        <p className="text-muted-foreground">
          Gerencie suas receitas e despesas
        </p>
      </div>

      <TransactionsList />
    </div>
  )
}
