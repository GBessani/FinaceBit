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

  const filteredTransactions = data.transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || t.type === filterType
    return matchesSearch && matchesType
  })

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
      <div className="flex flex-col sm:flex-row gap-3">
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

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | "all")}
              className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Transferência</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Transação</span>
            </button>
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
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
  const [type, setType] = useState<TransactionType>("expense")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  const categories = data.categories.filter((c) => c.type === type)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !categoryId) return

    onSubmit({
      id: generateId(),
      description,
      amount: parseFloat(amount),
      type,
      categoryId,
      date,
    })
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