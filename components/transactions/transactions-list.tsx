"use client"

import { TransferForm } from "@/components/transactions/transfer-form"
import { useState } from "react"
import { useFinance } from "@/contexts/finance-context"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { Transaction, TransactionType } from "@/lib/types"
import { generateId, formatCurrency, formatDate } from "@/lib/utils"
import { CategoryIcon } from "@/components/category-icon"
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  X,
  Filter,
  ArrowLeftRight,
  Copy,
} from "lucide-react"

export function TransactionsList() {
  const { data, addTransaction, deleteTransaction, getCategory, isLoaded } = useFinance()
  const [showTransfer, setShowTransfer] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<TransactionType | "all">("all")
  const [filterPeriod, setFilterPeriod] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  const filteredTransactions = (() => {
    let fromDate = ""
    let toDate = todayStr
    if (filterPeriod === "7d")  { const d = new Date(); d.setDate(d.getDate()-7);  fromDate = d.toISOString().split("T")[0] }
    if (filterPeriod === "30d") { const d = new Date(); d.setDate(d.getDate()-30); fromDate = d.toISOString().split("T")[0] }
    if (filterPeriod === "90d") { const d = new Date(); d.setDate(d.getDate()-90); fromDate = d.toISOString().split("T")[0] }
    if (filterPeriod === "custom") { fromDate = dateFrom; toDate = dateTo || todayStr }
    return data.transactions
      .filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === "all" || t.type === filterType
        const matchesDate = !fromDate || (t.date >= fromDate && t.date <= toDate)
        return matchesSearch && matchesType && matchesDate
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  })()

  const groupedTransactions = (() => {
    const groups: Record<string, typeof filteredTransactions> = {}
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  })()

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "income", "expense"] as const).map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}>
              {t === "all" ? "Todos" : t === "income" ? "Receitas" : "Despesas"}
            </button>
          ))}
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}>
            <Filter className="h-3.5 w-3.5" /> Período
          </button>
          <div className="flex gap-2 ml-auto shrink-0">
            <button onClick={() => setShowTransfer(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Transferência</span>
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Transação</span>
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { v: "all", l: "Tudo" }, { v: "7d", l: "7 dias" },
              { v: "30d", l: "30 dias" }, { v: "90d", l: "90 dias" },
              { v: "custom", l: "Personalizado" },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setFilterPeriod(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterPeriod === v ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}>
                {l}
              </button>
            ))}
            {filterPeriod === "custom" && (
              <div className="flex items-center gap-2 w-full">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <span className="text-muted-foreground text-sm">até</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            )}
          </div>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedTransactions.map(([date, txs]) => {
            const dayIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
            const dayExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
            const [y, m, d] = date.split("-").map(Number)
            const dateObj = new Date(y, m - 1, d)
            const today = new Date(); today.setHours(0,0,0,0)
            const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
            const dateLabel = dateObj.getTime() === today.getTime() ? "Hoje" :
              dateObj.getTime() === yesterday.getTime() ? "Ontem" :
              dateObj.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold text-muted-foreground capitalize">{dateLabel}</span>
                  <div className="flex gap-3 text-xs">
                    {dayIncome > 0 && <span className="text-emerald-600 font-medium">+{formatCurrency(dayIncome)}</span>}
                    {dayExpense > 0 && <span className="text-red-500 font-medium">-{formatCurrency(dayExpense)}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                {txs.map((transaction) => {
            const category = getCategory(transaction.categoryId)
            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${category?.color}15` }}
                  >
                    <CategoryIcon
                      icon={category?.icon || "Wallet"}
                      color={category?.color}
                      size={20}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {category?.name} • {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>

                  <button
                    onClick={() => setDeleteId(transaction.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <TransactionForm
          onClose={() => setShowForm(false)}
          onSubmit={(transaction) => {
            addTransaction(transaction)
            setShowForm(false)
          }}
        />
      )}
      {showTransfer && <TransferForm onClose={() => setShowTransfer(false)} />}
      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir transação?"
        description="A transação será removida permanentemente."
        onConfirm={() => { deleteId && deleteTransaction(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

interface TransactionFormProps {
  onClose: () => void
  onSubmit: (transaction: Transaction) => void
}

function TransactionForm({ onClose, onSubmit }: TransactionFormProps) {
  const { data } = useFinance()
  const [form, setForm] = useState({
    type: "expense" as TransactionType,
    description: "",
    amount: "",
    categoryId: "",
    date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { type, description, amount, categoryId, date } = form
  const setType = (v: TransactionType) => setForm(p => ({ ...p, type: v }))
  const setDescription = (v: string) => setForm(p => ({ ...p, description: v }))
  const setAmount = (v: string) => setForm(p => ({ ...p, amount: v }))
  const setCategoryId = (v: string) => setForm(p => ({ ...p, categoryId: v }))
  const setDate = (v: string) => setForm(p => ({ ...p, date: v }))

  const categories = data.categories.filter((c) => c.type === type)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!description.trim()) errs.description = "Descrição é obrigatória"
    if (!amount) errs.amount = "Valor é obrigatório"
    else if (parseFloat(amount) <= 0) errs.amount = "Valor deve ser maior que zero"
    if (!categoryId) errs.categoryId = "Selecione uma categoria"
    if (!date) errs.date = "Data é obrigatória"
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      id: generateId(),
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      categoryId,
      date,
    })
    setForm({ type: "expense", description: "", amount: "", categoryId: "", date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })() })
    setErrors({})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-lg">Nova Transação</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex gap-2 p-1 bg-secondary rounded-lg">
            <button
              type="button"
              onClick={() => {
                setType("expense")
                setCategoryId("")
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                type === "expense"
                  ? "bg-card shadow text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income")
                setCategoryId("")
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                type === "income"
                  ? "bg-card shadow text-emerald-600"
                  : "text-muted-foreground"
              }`}
            >
              Receita
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço no restaurante"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Valor</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Adicionar Transação
          </button>
        </form>
      </div>
    </div>
  )
}