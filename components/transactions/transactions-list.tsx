"use client"

import { useState, useMemo } from "react"
import { useFinance } from "@/contexts/finance-context"
import { Transaction } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO, isAfter, isBefore, isToday, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Plus, X, Trash2, Edit2, CheckCircle2, Clock, AlertCircle,
  TrendingUp, TrendingDown, ArrowLeftRight, Search, Filter
} from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

type Tab = "pending" | "overdue" | "completed"
type TransactionType = "income" | "expense" | "transfer"

export function TransactionsList() {
  const { data, addTransaction, updateTransaction, deleteTransaction, confirmTransaction, getCategory, isLoaded } = useFinance()
  const [activeTab, setActiveTab] = useState<Tab>("completed")
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all")

  const today = startOfDay(new Date())
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
  })()

  // Classify transactions
  const { pending, overdue, completed } = useMemo(() => {
    const txs = data.transactions.filter(t => {
      if (filterType !== "all" && t.type !== filterType) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    return {
      pending: txs.filter(t => t.status === "pending" && t.date >= todayStr),
      overdue: txs.filter(t => t.status === "pending" && t.date < todayStr),
      completed: txs.filter(t => t.status !== "pending").sort((a, b) => b.date.localeCompare(a.date)),
    }
  }, [data.transactions, search, filterType, todayStr])

  // Form state
  const [form, setForm] = useState<{
    type: TransactionType
    description: string
    amount: string
    categoryId: string
    date: string
    wallet: "digital" | "cash"
    installments: string
    status: "pending" | "completed"
  }>({
    type: "expense",
    description: "",
    amount: "",
    categoryId: "",
    date: todayStr,
    wallet: "digital",
    installments: "1",
    status: "completed",
  })

  function resetForm() {
    setForm({ type: "expense", description: "", amount: "", categoryId: "", date: todayStr, wallet: "digital", installments: "1", status: "completed" })
    setEditingTx(null)
    setShowForm(false)
  }

  function openEdit(tx: Transaction) {
    setForm({
      type: tx.type as TransactionType,
      description: tx.description,
      amount: tx.amount.toString(),
      categoryId: tx.categoryId,
      date: tx.date,
      wallet: tx.wallet ?? "digital",
      installments: tx.totalInstallments?.toString() ?? "1",
      status: tx.status ?? "completed",
    })
    setEditingTx(tx)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Preencha descrição e valor")
      return
    }

    const installments = parseInt(form.installments) || 1
    const groupId = installments > 1 ? crypto.randomUUID() : undefined
    const status = form.date > todayStr ? "pending" : form.status

    if (editingTx) {
      await updateTransaction({ ...editingTx, ...form, amount: parseFloat(form.amount), status })
      toast.success("Transação atualizada!")
    } else if (installments > 1) {
      // Create installments
      for (let i = 1; i <= installments; i++) {
        const [y, m, d] = form.date.split("-").map(Number)
        const instDate = new Date(y, m - 1 + (i - 1), d)
        const instDateStr = `${instDate.getFullYear()}-${String(instDate.getMonth()+1).padStart(2,"0")}-${String(instDate.getDate()).padStart(2,"0")}`
        // Each installment is 1 month apart from the previous, starting from purchase date
        const instStatus = instDateStr > todayStr ? "pending" : "completed"
        await addTransaction({
          id: crypto.randomUUID(),
          description: `${form.description} (${i}/${installments})`,
          amount: Math.round((parseFloat(form.amount) / installments) * 100) / 100,
          type: form.type,
          categoryId: form.categoryId,
          date: instDateStr,
          wallet: form.wallet,
          notes: form.type,
          status: instStatus,
          installmentNumber: i,
          totalInstallments: installments,
          installmentGroupId: groupId,
        })
      }
      toast.success(`${installments}x de ${formatCurrency(parseFloat(form.amount)/installments)} criadas!`)
    } else {
      await addTransaction({
        id: crypto.randomUUID(),
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        categoryId: form.categoryId,
        date: form.date,
        wallet: form.wallet,
        status,
      })
      toast.success("Transação adicionada!")
    }
    resetForm()
  }

  async function handleConfirm(tx: Transaction) {
    await confirmTransaction(tx.id)
    toast.success("Transação confirmada!")
  }

  const expenseCategories = data.categories.filter(c => c.type === "expense")
  const incomeCategories = data.categories.filter(c => c.type === "income")
  const categories = form.type === "income" ? incomeCategories : expenseCategories

  const tabs = [
    { id: "pending" as Tab, label: "A Vencer", icon: Clock, count: pending.length, color: "text-amber-500" },
    { id: "overdue" as Tab, label: "Atrasadas", icon: AlertCircle, count: overdue.length, color: "text-red-500" },
    { id: "completed" as Tab, label: "Concluídas", icon: CheckCircle2, count: completed.length, color: "text-emerald-500" },
  ]

  const currentList = activeTab === "pending" ? pending : activeTab === "overdue" ? overdue : completed

  if (!isLoaded) return (
    <div className="space-y-4">
      <div className="h-10 bg-muted rounded animate-pulse" />
      {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar transação..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none">
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </select>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
          <Plus className="h-4 w-4" /> Nova
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? tab.color : ""}`} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? `bg-primary/10 ${tab.color}` : "bg-muted text-muted-foreground"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {currentList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">
            {activeTab === "pending" ? "📅" : activeTab === "overdue" ? "⚠️" : "✅"}
          </div>
          <p className="font-medium">
            {activeTab === "pending" ? "Nenhum lançamento futuro" :
             activeTab === "overdue" ? "Nenhuma transação atrasada" :
             "Nenhuma transação encontrada"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map(tx => {
            const category = getCategory(tx.categoryId)
            return (
              <div key={tx.id} className={`bg-card border rounded-xl p-4 ${
                activeTab === "overdue" ? "border-red-200 dark:border-red-900" :
                activeTab === "pending" ? "border-amber-200 dark:border-amber-900" :
                "border-border"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {category && <CategoryIcon icon={category.icon} color={category.color} />}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tx.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{format(parseISO(tx.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                        {category && <span>· {category.name}</span>}
                        {tx.wallet === "cash" && <span>· 💵</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : tx.type === "expense" ? "text-red-500" : "text-blue-500"}`}>
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
                {(activeTab === "pending" || activeTab === "overdue") && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <button onClick={() => handleConfirm(tx)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                    </button>
                    <button onClick={() => openEdit(tx)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteId(tx.id)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                )}
                {activeTab === "completed" && (
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <button onClick={() => openEdit(tx)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteId(tx.id)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold">{editingTx ? "Editar Transação" : "Nova Transação"}</h3>
              <button onClick={resetForm} className="p-1.5 hover:bg-secondary rounded-lg"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Carteira */}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm(p => ({ ...p, wallet: "digital" }))}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${form.wallet === "digital" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary text-muted-foreground"}`}>
                  🏦 Conta Digital
                </button>
                <button type="button" onClick={() => setForm(p => ({ ...p, wallet: "cash" }))}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${form.wallet === "cash" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary text-muted-foreground"}`}>
                  💵 Dinheiro Físico
                </button>
              </div>

              {/* Tipo */}
              <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                {([["expense", "Despesa"], ["income", "Receita"], ["transfer", "Transferência"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm(p => ({ ...p, type: val, categoryId: "" }))}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${form.type === val ? "bg-card shadow" : "text-muted-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Aluguel, Salário..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Valor */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
                  <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    type="number" min="0" step="0.01" placeholder="0,00"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                </div>
                {/* Parcelas */}
                {!editingTx && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Parcelas</label>
                    <select value={form.installments} onChange={e => setForm(p => ({ ...p, installments: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <option key={n} value={n}>{n === 1 ? "À vista" : `${n}x`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Data */}
              <div>
                <label className="text-sm font-medium mb-1 block">Data</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {form.date > todayStr && (
                  <p className="text-xs text-amber-600 mt-1">📅 Data futura — será criado como "A Vencer"</p>
                )}
              </div>

              {/* Categoria */}
              {form.type !== "transfer" && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoria</label>
                  <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none">
                    <option value="">Sem categoria</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              )}

              {parseInt(form.installments) > 1 && form.amount && (
                <div className="p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground">
                  {form.installments}x de <strong>{formatCurrency(parseFloat(form.amount)/parseInt(form.installments))}</strong> = Total {formatCurrency(parseFloat(form.amount))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                  {editingTx ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirm isOpen={!!deleteId} title="Excluir transação?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => { deleteId && deleteTransaction(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)} />
    </div>
  )
}