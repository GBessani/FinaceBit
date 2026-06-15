"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useFinance } from "@/contexts/finance-context"
import { Transaction } from "@/lib/types"
import { formatCurrency, getCurrentMonth, getMonthName, parseMonth, localDateStr } from "@/lib/utils"
import { validateAmount, validateDate } from "@/lib/validation"
import { format, parseISO, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Plus, X, Trash2, Edit2, CheckCircle2, Clock, AlertCircle,
  Search, CreditCard,
} from "lucide-react"
import { CategoryIcon } from "@/components/categories/category-icon"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

type Tab = "pending" | "overdue" | "completed"
type TransactionType = "income" | "expense" | "transfer"
type WalletMode = "digital" | "cash" | "card"

export function TransactionsList() {
  const {
    data,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    confirmTransaction,
    getCategory,
    isLoaded,
    addCCPurchase,
    creditCards,
  } = useFinance()

  const [activeTab, setActiveTab] = useState<Tab>("completed")
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all")
  const [visibleCount, setVisibleCount] = useState(30)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    setVisibleCount(30)
  }, [activeTab, search, filterType, selectedMonth])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    data.transactions.forEach(t => months.add(t.date.substring(0, 7)))
    for (let i = -1; i <= 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      months.add(localDateStr(d).substring(0, 7))
    }
    return Array.from(months).sort().reverse()
  }, [data.transactions])

  const todayStr = localDateStr()

  const { pending, overdue, completed } = useMemo(() => {
    const txs = data.transactions.filter(t => {
      if (filterType !== "all" && t.type !== filterType) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedMonth && !t.date.startsWith(selectedMonth)) return false
      return true
    })
    return {
      pending:   txs.filter(t => t.status === "pending" && t.date >= todayStr),
      overdue:   txs.filter(t => t.status === "pending" && t.date < todayStr),
      completed: txs.filter(t => t.status !== "pending").sort((a, b) => b.date.localeCompare(a.date)),
    }
  }, [data.transactions, search, filterType, todayStr, selectedMonth])

  // ─── Form state ──────────────────────────────────────────────────────────────

  const [walletMode, setWalletMode] = useState<WalletMode>("digital")
  const [form, setForm] = useState<{
    type: TransactionType
    description: string
    amount: string
    categoryId: string
    date: string
    wallet: "digital" | "cash"
    installments: string
    status: "pending" | "completed"
    // campo exclusivo do modo cartão
    cardId: string
  }>({
    type: "expense",
    description: "",
    amount: "",
    categoryId: "",
    date: todayStr,
    wallet: "digital",
    installments: "1",
    status: "completed",
    cardId: "",
  })

  function resetForm() {
    setWalletMode("digital")
    setForm({
      type: "expense",
      description: "",
      amount: "",
      categoryId: "",
      date: todayStr,
      wallet: "digital",
      installments: "1",
      status: "completed",
      cardId: "",
    })
    setEditingTx(null)
    setShowForm(false)
  }

  function openEdit(tx: Transaction) {
    // Edição nunca abre no modo cartão (compras no cartão não são transações diretas)
    const wallet = (tx.wallet ?? "digital") as "digital" | "cash"
    setWalletMode(wallet)
    setForm({
      type: tx.type as TransactionType,
      description: tx.description,
      amount: tx.amount.toString(),
      categoryId: tx.categoryId,
      date: tx.date,
      wallet,
      installments: tx.totalInstallments?.toString() ?? "1",
      status: tx.status ?? "completed",
      cardId: "",
    })
    setEditingTx(tx)
    setShowForm(true)
  }

  function handleWalletChange(mode: WalletMode) {
    setWalletMode(mode)
    if (mode === "card") {
      // Compra no cartão é sempre despesa; pré-seleciona o primeiro cartão disponível
      setForm(p => ({
        ...p,
        type: "expense",
        cardId: creditCards[0]?.id ?? "",
      }))
    } else {
      setForm(p => ({ ...p, wallet: mode }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // ── Modo cartão ─────────────────────────────────────────────
    if (walletMode === "card") {
      if (!form.description.trim()) { toast.error("Preencha a descrição"); return }
      const amtErrCard = validateAmount(form.amount)
      if (amtErrCard) { toast.error(amtErrCard); return }
      const dateErrCard = validateDate(form.date, "Data da compra")
      if (dateErrCard) { toast.error(dateErrCard); return }
      if (!form.cardId) {
        toast.error("Selecione um cartão")
        return
      }
      const installments = parseInt(form.installments) || 1
      await addCCPurchase(
        {
          creditCardId: form.cardId,
          description: form.description,
          totalAmount: parseFloat(form.amount),
          installments,
          categoryId: form.categoryId || undefined,
          purchaseDate: form.date,
        },
        installments,
      )
      toast.success(
        installments > 1
          ? `${installments}x de ${formatCurrency(parseFloat(form.amount) / installments)} no cartão!`
          : "Compra no cartão registrada!",
      )
      resetForm()
      return
    }

    // ── Transação normal ─────────────────────────────────────────
    if (!form.description.trim()) { toast.error("Preencha a descrição"); return }
    const amtErr = validateAmount(form.amount)
    if (amtErr) { toast.error(amtErr); return }
    const dateErr = validateDate(form.date)
    if (dateErr) { toast.error(dateErr); return }

    const installments = parseInt(form.installments) || 1
    const groupId = installments > 1 ? crypto.randomUUID() : undefined
    const status: "pending" | "completed" = form.date > todayStr ? "pending" : "completed"

    if (editingTx) {
      await updateTransaction({ ...editingTx, ...form, amount: parseFloat(form.amount), status })
      toast.success("Transação atualizada!")
    } else if (installments > 1) {
      for (let i = 1; i <= installments; i++) {
        const [y, m, d] = form.date.split("-").map(Number)
        const instDate = new Date(y, m - 1 + (i - 1), d)
        const instDateStr = localDateStr(instDate)
        const instStatus: "pending" | "completed" = instDateStr > todayStr ? "pending" : "completed"
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
      toast.success(`${installments}x de ${formatCurrency(parseFloat(form.amount) / installments)} criadas!`)
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
  const incomeCategories  = data.categories.filter(c => c.type === "income")
  const categories = walletMode === "card" || form.type === "expense"
    ? expenseCategories
    : form.type === "income" ? incomeCategories : []

  const tabs = [
    { id: "pending"   as Tab, label: "A Vencer",   icon: Clock,        count: pending.length,   color: "text-amber-500"  },
    { id: "overdue"   as Tab, label: "Atrasadas",   icon: AlertCircle,  count: overdue.length,   color: "text-red-500"    },
    { id: "completed" as Tab, label: "Concluídas",  icon: CheckCircle2, count: completed.length, color: "text-emerald-500"},
  ]

  const currentList = activeTab === "pending" ? pending : activeTab === "overdue" ? overdue : completed
  const visibleList = currentList.slice(0, visibleCount)
  const hasMore = currentList.length > visibleCount

  // Cartão selecionado (para exibir cor/nome no preview)
  const selectedCard = creditCards.find(c => c.id === form.cardId)

  if (!isLoaded) return (
    <div className="space-y-4">
      <div className="h-10 bg-muted rounded animate-pulse" />
      {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Month selector */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowMonthPicker(p => !p)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-medium text-sm transition-colors ${
            showMonthPicker ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
          }`}
        >
          <span>{selectedMonth ? `${getMonthName(parseMonth(selectedMonth).month)} ${parseMonth(selectedMonth).year}` : "📅 Todos os meses"}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-muted-foreground transition-transform ${showMonthPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showMonthPicker && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <button
              onClick={() => { setSelectedMonth(null); setShowMonthPicker(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors ${!selectedMonth ? "bg-primary/10 text-primary font-medium" : ""}`}
            >
              Todos os meses
            </button>
            <div className="max-h-64 overflow-y-auto">
              {availableMonths.map(m => {
                const { year, month } = parseMonth(m)
                return (
                  <button key={m} onClick={() => { setSelectedMonth(m); setShowMonthPicker(false) }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors ${selectedMonth === m ? "bg-primary/10 text-primary font-medium" : ""}`}>
                    {getMonthName(month)} {year}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar transação..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as "all" | TransactionType)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
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
            {activeTab === "pending"  ? "Nenhum lançamento futuro"    :
             activeTab === "overdue"  ? "Nenhuma transação atrasada"  :
                                        "Nenhuma transação encontrada"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleList.map(tx => {
            const category = getCategory(tx.categoryId)
            return (
              <div key={tx.id} className={`bg-card border rounded-xl p-4 ${
                activeTab === "overdue"  ? "border-red-200 dark:border-red-900"   :
                activeTab === "pending"  ? "border-amber-200 dark:border-amber-900" :
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
                    <span className={`font-bold ${
                      tx.type === "income"   ? "text-emerald-600 dark:text-emerald-400" :
                      tx.type === "expense"  ? "text-red-500" :
                                               "text-blue-500"
                    }`}>
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
          {hasMore && (
            <button
              onClick={() => setVisibleCount(c => c + 30)}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-secondary transition-colors"
            >
              Mostrar mais ({currentList.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}

      {/* ── Modal Form ────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold">
                {editingTx
                  ? "Editar Transação"
                  : walletMode === "card"
                  ? "Nova Compra no Cartão"
                  : "Nova Transação"}
              </h3>
              <button onClick={resetForm} className="p-1.5 hover:bg-secondary rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">

              {/* ── Seletor de origem ── */}
              {!editingTx && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleWalletChange("digital")}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      walletMode === "digital"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="text-base">🏦</span>
                    Conta Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWalletChange("cash")}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      walletMode === "cash"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="text-base">💵</span>
                    Dinheiro Físico
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWalletChange("card")}
                    disabled={creditCards.length === 0}
                    title={creditCards.length === 0 ? "Cadastre um cartão primeiro" : undefined}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      walletMode === "card"
                        ? "border-primary bg-primary/10 text-primary"
                        : creditCards.length === 0
                        ? "border-border opacity-40 cursor-not-allowed text-muted-foreground"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="text-base">💳</span>
                    Cartão
                  </button>
                </div>
              )}

              {/* ── Modo edição: mostrar wallet atual como read-only ── */}
              {editingTx && (
                <div className="flex gap-2">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
                    form.wallet === "cash" ? "border-border bg-secondary/50" : "border-border bg-secondary/50"
                  }`}>
                    {form.wallet === "cash" ? "💵 Dinheiro Físico" : "🏦 Conta Digital"}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  MODO CARTÃO
              ══════════════════════════════════════════════════════ */}
              {walletMode === "card" && (
                <>
                  {/* Seletor de cartão */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cartão</label>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(creditCards.length, 3)}, 1fr)` }}>
                      {creditCards.map(card => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, cardId: card.id }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors truncate ${
                            form.cardId === card.id
                              ? "border-2 bg-card shadow-sm"
                              : "border-border hover:bg-secondary text-muted-foreground"
                          }`}
                          style={form.cardId === card.id ? { borderColor: card.color } : undefined}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: card.color }}
                          />
                          <span className="truncate">{card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Descrição</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Ex: Supermercado, Netflix..."
                      maxLength={100}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Valor */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Valor total (R$)</label>
                      <input
                        value={form.amount}
                        onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                        type="number" min="0.01" step="0.01" placeholder="0,00"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {/* Parcelas */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Parcelas</label>
                      <select
                        value={form.installments}
                        onChange={e => setForm(p => ({ ...p, installments: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <option key={n} value={n}>
                            {n === 1 ? "À vista" : `${n}x`}
                            {n > 1 && form.amount && !isNaN(parseFloat(form.amount))
                              ? ` de ${formatCurrency(parseFloat(form.amount) / n)}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Data da compra</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Categoria</label>
                    <select
                      value={form.categoryId}
                      onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none"
                    >
                      <option value="">Sem categoria</option>
                      {expenseCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview parcelamento */}
                  {parseInt(form.installments) > 1 && form.amount && !isNaN(parseFloat(form.amount)) && (
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: selectedCard ? `${selectedCard.color}15` : undefined,
                        borderLeft: selectedCard ? `3px solid ${selectedCard.color}` : undefined,
                      }}
                    >
                      <p className="font-medium text-foreground">
                        {form.installments}x de{" "}
                        <strong>{formatCurrency(parseFloat(form.amount) / parseInt(form.installments))}</strong>
                        {" "}= Total {formatCurrency(parseFloat(form.amount))}
                      </p>
                      {selectedCard && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Aparecerá nas próximas faturas do {selectedCard.name}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ══════════════════════════════════════════════════════
                  MODO TRANSAÇÃO NORMAL
              ══════════════════════════════════════════════════════ */}
              {walletMode !== "card" && (
                <>
                  {/* Tipo */}
                  <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                    {([ ["expense", "Despesa"], ["income", "Receita"], ["transfer", "Transferência"] ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, type: val, categoryId: "" }))}
                        className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                          form.type === val ? "bg-card shadow" : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Descrição</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Ex: Aluguel, Salário..."
                      maxLength={100}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Valor */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
                      <input
                        value={form.amount}
                        onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                        type="number" min="0.01" step="0.01" placeholder="0,00"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {/* Parcelas */}
                    {!editingTx && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Parcelas</label>
                        <select
                          value={form.installments}
                          onChange={e => setForm(p => ({ ...p, installments: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none"
                        >
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
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {form.date > todayStr && (
                      <p className="text-xs text-amber-600 mt-1">📅 Data futura — será criado como "A Vencer"</p>
                    )}
                  </div>

                  {/* Categoria */}
                  {form.type !== "transfer" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Categoria</label>
                      <select
                        value={form.categoryId}
                        onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none"
                      >
                        <option value="">Sem categoria</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Preview parcelamento */}
                  {!editingTx && parseInt(form.installments) > 1 && form.amount && !isNaN(parseFloat(form.amount)) && (
                    <div className="p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground">
                      {form.installments}x de{" "}
                      <strong>{formatCurrency(parseFloat(form.amount) / parseInt(form.installments))}</strong>
                      {" "}= Total {formatCurrency(parseFloat(form.amount))}
                    </div>
                  )}
                </>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  {editingTx
                    ? "Salvar"
                    : walletMode === "card"
                    ? "Registrar Compra"
                    : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir transação?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => { deleteId && deleteTransaction(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}