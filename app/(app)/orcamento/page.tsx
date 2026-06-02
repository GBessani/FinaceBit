"use client"

import { useFinance } from "@/contexts/finance-context"
import { formatCurrency, getCurrentMonth, getMonthName, parseMonth } from "@/lib/utils"
import { useState, useMemo } from "react"
import { Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

export default function OrcamentoPage() {
  const { data, getCategory, addBudget, deleteBudget } = useFinance()
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const { year, month } = parseMonth(currentMonth)
  const [showForm, setShowForm] = useState(false)
  const [categoryId, setCategoryId] = useState("")
  const [amount, setAmount] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const expenseCategories = data.categories.filter(c => c.type === "expense")

  // Orçamentos do mês atual
  const monthBudgets = useMemo(() =>
    data.budgets.filter(b => b.month === currentMonth || b.month === "recorrente")
  , [data.budgets, currentMonth])

  // Gastos reais por categoria no mês
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    data.transactions
      .filter(t => t.type === "expense" && t.date.startsWith(currentMonth))
      .forEach(t => {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.amount
      })
    return map
  }, [data.transactions, currentMonth])

  const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = monthBudgets.reduce((s, b) => s + (spentByCategory[b.categoryId] || 0), 0)
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  function prevMonth() {
    const d = new Date(year, month - 1, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  async function handleSave() {
    const errs: Record<string, string> = {}
    if (!categoryId) errs.category = "Selecione uma categoria"
    if (!amount || parseFloat(amount) <= 0) errs.amount = "Valor deve ser maior que zero"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    await addBudget({ categoryId, amount: parseFloat(amount), month: currentMonth })
    toast.success("Orçamento salvo!")
    setShowForm(false)
    setCategoryId("")
    setAmount("")
    setErrors({})
  }

  const availableCategories = expenseCategories.filter(
    c => !monthBudgets.find(b => b.categoryId === c.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamento</h1>
          <p className="text-muted-foreground">Controle de gastos por categoria</p>
        </div>
        <button onClick={() => setShowForm(true)} disabled={availableCategories.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold w-40 text-center">{getMonthName(month)} {year}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Resumo geral */}
      {monthBudgets.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Total orçado</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Gasto até agora</p>
              <p className={`text-2xl font-bold ${totalPercent >= 100 ? "text-red-500" : totalPercent >= 80 ? "text-amber-500" : "text-emerald-600"}`}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalPercent >= 100 ? "bg-red-500" : totalPercent >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{totalPercent.toFixed(0)}% utilizado</span>
            <span>Disponível: {formatCurrency(Math.max(0, totalBudget - totalSpent))}</span>
          </div>
        </div>
      )}

      {/* Lista de orçamentos por categoria */}
      {monthBudgets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum orçamento definido</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione limites por categoria para controlar seus gastos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {monthBudgets.map(budget => {
            const cat = getCategory(budget.categoryId)
            const spent = spentByCategory[budget.categoryId] || 0
            const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            const isOver = percent >= 100
            const isWarning = percent >= 80 && !isOver

            return (
              <div key={budget.id} className={`bg-card border rounded-xl p-5 shadow-sm transition-colors ${isOver ? "border-red-300 dark:border-red-800" : isWarning ? "border-amber-300 dark:border-amber-800" : "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color || "#6b7280" }} />
                    <div>
                      <p className="font-semibold">{cat?.name || "Categoria"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(spent)} de {formatCurrency(budget.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOver && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Limite excedido</span>}
                    {isWarning && <span className="flex items-center gap-1 text-xs text-amber-500 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> 80% atingido</span>}
                    {!isOver && !isWarning && percent > 0 && <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="h-3.5 w-3.5" /> No limite</span>}
                    <button onClick={() => setDeleteId(budget.id)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{percent.toFixed(0)}% utilizado</span>
                  <span>{isOver ? `${formatCurrency(spent - budget.amount)} acima` : `${formatCurrency(budget.amount - spent)} restante`}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de adicionar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg">Novo Orçamento</h3>
            <p className="text-sm text-muted-foreground -mt-2">Para {getMonthName(month)} {year}</p>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setErrors(p => ({ ...p, category: "" })) }}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.category ? "border-red-400" : "border-border"}`}>
                <option value="">Selecione...</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Limite mensal (R$)</label>
              <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: "" })) }}
                placeholder="0,00" min="0" step="0.01"
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.amount ? "border-red-400" : "border-border"}`} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowForm(false); setErrors({}) }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteId}
        title="Remover orçamento?"
        description="O limite desta categoria será removido."
        onConfirm={() => { deleteId && deleteBudget(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}