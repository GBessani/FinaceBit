"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useFinance } from "@/contexts/finance-context"
import { Transaction, FixedBill, RecurrenceType, CreditCard, CreditCardInstallment } from "@/lib/types"
import { formatCurrency, getCurrentMonth, getMonthName, parseMonth, localDateStr, getActiveInvoiceMonth } from "@/lib/utils"
import { validateAmount, validateDate } from "@/lib/validation"
import { format, parseISO, startOfDay, isToday, isYesterday } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Plus, X, Trash2, Edit2, CheckCircle2, Clock, AlertCircle,
  Search, CreditCard as CreditCardIcon, Upload, RefreshCw,
} from "lucide-react"
import { CategoryIcon } from "@/components/categories/category-icon"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { OFXImportModal } from "@/components/transactions/ofx-import-modal"
import { toast } from "sonner"

type Tab = "pending" | "overdue" | "completed"
type TransactionType = "income" | "expense" | "transfer"
type WalletMode = "digital" | "cash" | "card"


interface InvoicePendingCardProps {
  card: CreditCard
  total: number
  installments: CreditCardInstallment[]
  dueDate: string
  activeMonth: string
  payCCInvoice: (cardId: string, month: string, total: number, ids: string[], name?: string) => Promise<void>
}

function InvoicePendingCard({ card, total, installments, dueDate, activeMonth, payCCInvoice }: InvoicePendingCardProps) {
  const [paying, setPaying] = useState(false)
  const todayStr = localDateStr()
  const isOverdue = dueDate < todayStr

  async function handlePay() {
    if (paying) return
    setPaying(true)
    try {
      await payCCInvoice(
        card.id,
        activeMonth,
        total,
        installments.map(i => i.id),
        card.name,
      )
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className={`bg-card border rounded-xl p-4 transition-colors ${
      isOverdue ? "border-red-200 dark:border-red-900" : "border-indigo-200 dark:border-indigo-900"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Dot colorido do cartão */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: card.color + "22", border: `2px solid ${card.color}` }}
          >
            <CreditCardIcon className="h-4 w-4" style={{ color: card.color }} />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">Fatura {card.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>Vence dia {card.dueDay}</span>
              <span>·</span>
              <span>{installments.length} {installments.length === 1 ? "compra" : "compras"}</span>
              {isOverdue && (
                <>
                  <span>·</span>
                  <span className="text-red-500 font-medium">Em atraso</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-bold text-red-500">-{formatCurrency(total)}</p>
          <button
            onClick={handlePay}
            disabled={paying}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {paying ? "..." : "Pagar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmFixedBillButton({ bill }: { bill: FixedBill }) {
  const { addTransaction } = useFinance()
  const [loading, setLoading] = useState(false)

  async function confirm() {
    if (loading) return
    setLoading(true)
    try {
      await addTransaction({
        id: crypto.randomUUID(),
        description: bill.description,
        amount: bill.amount,
        type: bill.type as "income" | "expense",
        categoryId: bill.categoryId,
        date: localDateStr(),
        wallet: (bill.wallet === "credit_card" ? "digital" : bill.wallet) as "digital" | "cash",
        status: "completed",
        notes: "Confirmado de conta fixa",
      })
      toast.success(`${bill.description} confirmada!`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={confirm}
      disabled={loading}
      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      {loading ? "..." : "Confirmar"}
    </button>
  )
}

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
    addFixedBill,
    payCCInvoice,
    creditCards,
  } = useFinance()

  const [activeTab, setActiveTab] = useState<Tab>("completed")
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [showOFXImport, setShowOFXImport] = useState(false)
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

  // Próxima fatura não paga de cada cartão — menor dueMonth com parcelas pendentes.
  // Não depende de closingDay/activeMonth: funciona mesmo quando a fatura já fechou
  // mas ainda não foi paga.
  const pendingInvoices = useMemo(() => {
    return data.creditCards
      .filter(card => card.isActive)
      .map(card => {
        const unpaid = data.ccInstallments.filter(
          i => i.creditCardId === card.id && !i.isPaid
        )
        if (unpaid.length === 0) return null

        // Mês mais próximo com parcelas não pagas
        const nextMonth = unpaid.reduce((min, i) => i.dueMonth < min ? i.dueMonth : min, unpaid[0].dueMonth)
        const installments = unpaid.filter(i => i.dueMonth === nextMonth)
        const total = installments.reduce((s, i) => s + i.amount, 0)

        // Data de vencimento real: dia dueDay no mês da fatura
        const [y, m] = nextMonth.split("-").map(Number)
        const dueDate = `${y}-${String(m).padStart(2,"0")}-${String(card.dueDay).padStart(2,"0")}`
        return { card, total, installments, dueDate, dueMonth: nextMonth }
      })
      .filter(Boolean) as { card: typeof data.creditCards[0]; total: number; installments: typeof data.ccInstallments; dueDate: string; dueMonth: string }[]
  }, [data.creditCards, data.ccInstallments])

  // Contas fixas ativas que vencem no mês selecionado (para a aba "Contas Fixas")
  const fixedBillsDueThisMonth = useMemo(() => {
    const month = selectedMonth || getCurrentMonth()
    return data.fixedBills.filter(b => {
      if (!b.isActive || b.type === "income") return false
      // Filtra pelo mês selecionado via dueDay — a conta vence nesse mês
      const [y, m] = month.split("-").map(Number)
      const dueDate = `${y}-${String(m).padStart(2,"0")}-${String(b.dueDay).padStart(2,"0")}`
      return dueDate.startsWith(month)
    })
  }, [data.fixedBills, selectedMonth])

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
  const [isFixed, setIsFixed] = useState(false)
  const [fixedDueDay, setFixedDueDay] = useState("1")
  const [fixedRecurrence, setFixedRecurrence] = useState<RecurrenceType>("monthly")
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
    setIsFixed(false)
    setFixedDueDay("1")
    setFixedRecurrence("monthly")
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

    // ── Conta fixa ──────────────────────────────────────────────
    if (isFixed) {
      if (!form.description.trim()) { toast.error("Preencha a descrição"); return }
      const amtErrF = validateAmount(form.amount)
      if (amtErrF) { toast.error(amtErrF); return }
      const dueDay = parseInt(fixedDueDay)
      if (!fixedDueDay || dueDay < 1 || dueDay > 31) { toast.error("Dia de vencimento inválido"); return }
      const wm = walletMode as WalletMode
      const billWallet: "digital" | "cash" | "credit_card" =
        wm === "card" ? "credit_card" : wm as "digital" | "cash"
      const billCardId = wm === "card" ? form.cardId : undefined
      if (billWallet === "credit_card" && !billCardId) { toast.error("Selecione um cartão"); return }
      await addFixedBill({
        id: crypto.randomUUID(),
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type as "income" | "expense",
        categoryId: form.categoryId,
        dueDay,
        recurrence: fixedRecurrence,
        isActive: true,
        notes: undefined,
        wallet: billWallet,
        creditCardId: billCardId,
      })
      toast.success("Conta fixa criada!")
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
      const totalAmount = parseFloat(form.amount)
      const baseInstallment = Math.round((totalAmount / installments) * 100) / 100
      const lastInstallment = Math.round((totalAmount - baseInstallment * (installments - 1)) * 100) / 100
      for (let i = 1; i <= installments; i++) {
        const [y, m, d] = form.date.split("-").map(Number)
        const instDate = new Date(y, m - 1 + (i - 1), d)
        const instDateStr = localDateStr(instDate)
        const instStatus: "pending" | "completed" = instDateStr > todayStr ? "pending" : "completed"
        await addTransaction({
          id: crypto.randomUUID(),
          description: `${form.description} (${i}/${installments})`,
          amount: i === installments ? lastInstallment : baseInstallment,
          type: form.type,
          categoryId: form.categoryId,
          date: instDateStr,
          wallet: form.wallet,
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
    { id: "overdue"   as Tab, label: "Contas Fixas", icon: RefreshCw,   count: fixedBillsDueThisMonth.length, color: "text-purple-500" },
    { id: "completed" as Tab, label: "Concluídas",  icon: CheckCircle2, count: completed.length, color: "text-emerald-500"},
  ]

  const currentList = activeTab === "pending" ? pending : activeTab === "overdue" ? overdue : completed
  const visibleList = currentList.slice(0, visibleCount)
  const hasMore = currentList.length > visibleCount

  // Agrupa as transações visíveis por data, preservando a ordem da lista.
  // Cada grupo carrega: label amigável, contagem e total do dia (saldo:
  // receitas somam, despesas subtraem; transfer não afeta).
  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; label: string; items: Transaction[]; total: number }[] = []
    const byKey = new Map<string, { label: string; items: Transaction[]; total: number }>()

    for (const tx of visibleList) {
      const key = tx.date // YYYY-MM-DD
      if (!byKey.has(key)) {
        const d = parseISO(key)
        const label = isToday(d)
          ? "Hoje"
          : isYesterday(d)
          ? "Ontem"
          : format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        const grp = { label, items: [] as Transaction[], total: 0 }
        byKey.set(key, grp)
        groups.push({ dateKey: key, ...grp } as any)
      }
      const grp = byKey.get(key)!
      grp.items.push(tx)
      grp.total += tx.type === "income" ? tx.amount : tx.type === "expense" ? -tx.amount : 0
    }

    // reconstrói o array final na ordem de aparição, com os dados já preenchidos
    const seen = new Set<string>()
    const ordered: { dateKey: string; label: string; items: Transaction[]; total: number }[] = []
    for (const tx of visibleList) {
      if (seen.has(tx.date)) continue
      seen.add(tx.date)
      const g = byKey.get(tx.date)!
      ordered.push({ dateKey: tx.date, label: g.label, items: g.items, total: g.total })
    }
    return ordered
  }, [visibleList])

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowOFXImport(true)}
            title="Importar extrato OFX"
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar OFX</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova
          </button>
        </div>
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
      {activeTab === "overdue" ? (
        /* ── ABA CONTAS FIXAS ──────────────────────────────────── */
        fixedBillsDueThisMonth.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">🔄</div>
            <p className="font-medium">Nenhuma conta fixa para o mês</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fixedBillsDueThisMonth.map(bill => {
              const category = getCategory(bill.categoryId)
              const card = bill.creditCardId ? data.creditCards.find(c => c.id === bill.creditCardId) : null
              return (
                <div key={bill.id} className="bg-card border border-purple-200 dark:border-purple-900 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    {category && <CategoryIcon icon={category.icon} color={category.color} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{bill.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>Dia {bill.dueDay}</span>
                        <span>·</span>
                        <span>{{ monthly: "Mensal", weekly: "Semanal", biweekly: "Quinzenal", yearly: "Anual" }[bill.recurrence]}</span>
                        {card && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: card.color }} />
                              {card.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-semibold text-red-500">-{formatCurrency(bill.amount)}</p>
                      <ConfirmFixedBillButton bill={bill} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : currentList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">
            {activeTab === "pending" ? "📅" : "✅"}
          </div>
          <p className="font-medium">
            {activeTab === "pending" ? "Nenhum lançamento futuro" : "Nenhuma transação encontrada"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Faturas de cartão pendentes (só na aba A Vencer) ── */}
          {activeTab === "pending" && pendingInvoices.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <CreditCardIcon className="h-3.5 w-3.5 text-indigo-500" />
                  Faturas de Cartão
                </span>
                <span className="text-xs text-muted-foreground">
                  {pendingInvoices.length} {pendingInvoices.length === 1 ? "cartão" : "cartões"}
                </span>
              </div>
              {pendingInvoices.map((inv) => {
                return (
                <InvoicePendingCard
                  key={inv.card.id}
                  card={inv.card}
                  total={inv.total}
                  installments={inv.installments}
                  dueDate={inv.dueDate}
                  activeMonth={inv.dueMonth}
                  payCCInvoice={payCCInvoice}
                />
                )
              })}
            </div>
          )}

          {groupedByDate.map(group => (
            <div key={group.dateKey} className="space-y-2">
              {/* Cabeçalho do dia: data · contagem · total */}
              <div className="flex items-center justify-between px-1 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-1">
                <span className="text-sm font-semibold text-foreground capitalize">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                  {group.total !== 0 && (
                    <> · <span className={group.total > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 font-medium"}>
                      {group.total > 0 ? "+" : "-"}{formatCurrency(Math.abs(group.total))}
                    </span></>
                  )}
                </span>
              </div>
              {group.items.map(tx => {
                const category = getCategory(tx.categoryId)
                return (
                  <div key={tx.id} className={`bg-card border rounded-xl p-4 ${
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

                {activeTab === "pending" && (
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
          ))}
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

              {/* ── Switch: É conta fixa? (só para criação, não edição) ── */}
              {!editingTx && walletMode !== "card" && (
                <button
                  type="button"
                  onClick={() => setIsFixed(f => !f)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    isFixed
                      ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    É conta fixa? (recorrente todo mês)
                  </span>
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${isFixed ? "bg-purple-500" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFixed ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>
              )}

              {/* ── Campos extras de conta fixa ── */}
              {isFixed && !editingTx && walletMode !== "card" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-purple-700 dark:text-purple-300">Dia de vencimento</label>
                    <input
                      type="number"
                      min="1" max="31"
                      value={fixedDueDay}
                      onChange={e => setFixedDueDay(e.target.value)}
                      inputMode="numeric"
                      className="w-full px-2 py-1.5 text-sm border border-purple-200 dark:border-purple-700 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-purple-700 dark:text-purple-300">Recorrência</label>
                    <select
                      value={fixedRecurrence}
                      onChange={e => setFixedRecurrence(e.target.value as RecurrenceType)}
                      className="w-full px-2 py-1.5 text-sm border border-purple-200 dark:border-purple-700 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
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

      {showOFXImport && (
        <OFXImportModal onClose={() => setShowOFXImport(false)} />
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