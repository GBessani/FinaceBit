"use client"

import * as React from "react"
import { useConsultant } from "./consultant-context"
import { createClient } from "@/lib/supabase/client"
import {
  FinancialData,
  Transaction,
  Category,
  Goal,
  FixedBill,
  ScheduledTransaction,
  Investment,
  CreditCard,
  InvestmentTransaction,
  Budget,
  CreditCardPurchase,
  CreditCardInstallment,
} from "@/lib/types"
import { User } from "@supabase/supabase-js"
import { toast } from "sonner"

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    type: row.type as "income" | "expense",
  }
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    type: row.type as "income" | "expense",
    categoryId: (row.category_id as string) ?? "",
    date: (row.date as string).substring(0, 10),
    notes: row.notes as string | undefined,
  }
}

function mapGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    name: row.name as string,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    deadline: (row.deadline as string).substring(0, 10),
    color: row.color as string,
  }
}

function mapFixedBill(row: Record<string, unknown>): FixedBill {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    type: row.type as "income" | "expense",
    categoryId: (row.category_id as string) ?? "",
    dueDay: row.due_day as number,
    recurrence: row.recurrence as FixedBill["recurrence"],
    isActive: row.is_active as boolean,
    notes: row.notes as string | undefined,
    totalInstallments: row.total_installments as number | undefined,
    currentInstallment: row.current_installment as number | undefined,
    startDate: row.start_date as string | undefined,
  }
}

function mapScheduledTransaction(row: Record<string, unknown>): ScheduledTransaction {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    type: row.type as "income" | "expense",
    categoryId: (row.category_id as string) ?? "",
    scheduledDate: (row.scheduled_date as string).substring(0, 10),
    isCompleted: row.is_completed as boolean,
    notes: row.notes as string | undefined,
    fixedBillId: row.fixed_bill_id as string | undefined,
    installmentNumber: row.installment_number as number | undefined,
    creditCardId: row.credit_card_id as string | undefined,
    totalInstallments: row.total_installments as number | undefined,
  }
}

function mapCreditCard(row: Record<string, unknown>): CreditCard {
  return {
    id: row.id as string,
    name: row.name as string,
    limitAmount: Number(row.limit_amount),
    dueDay: row.due_day as number,
    closingDay: row.closing_day as number,
    color: row.color as string,
    isActive: row.is_active as boolean,
  }
}

function mapInvestmentTransaction(row: Record<string, unknown>): InvestmentTransaction {
  return {
    id: row.id as string,
    investmentId: row.investment_id as string,
    type: row.type as "buy" | "sell",
    quantity: Number(row.quantity),
    price: Number(row.price),
    total: Number(row.total),
    date: row.date as string,
    notes: row.notes as string | undefined,
  }
}

function mapInvestment(row: Record<string, unknown>): Investment {
  const quantity = Number(row.quantity)
  const avgPrice = Number(row.avg_price)
  const investedAmount = Number(row.invested_amount) || (quantity * avgPrice)
  return {
    id: row.id as string,
    name: row.name as string,
    ticker: row.ticker as string,
    assetType: row.asset_type as Investment["assetType"],
    quantity,
    avgPrice,
    notes: row.notes as string | undefined,
    investedAmount,
    investedAt: (row.invested_at as string) || undefined,
    rate: row.rate ? Number(row.rate) : undefined,
    rateIndex: row.rate_index as Investment["rateIndex"] | undefined,
    maturityDate: row.maturity_date as string | undefined,
  }
}

interface FinanceContextType {
  data: FinancialData
  isLoaded: boolean
  user: User | null
  addTransaction: (transaction: Transaction) => Promise<void>
  confirmTransaction: (id: string) => Promise<void>
  updateTransaction: (transaction: Transaction) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addCategory: (category: Category) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addGoal: (goal: Goal) => Promise<void>
  updateGoal: (goal: Goal) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addFixedBill: (bill: FixedBill) => Promise<void>
  updateFixedBill: (bill: FixedBill) => Promise<void>
  deleteFixedBill: (id: string) => Promise<void>
  addScheduledTransaction: (transaction: ScheduledTransaction) => Promise<void>
  updateScheduledTransaction: (transaction: ScheduledTransaction) => Promise<void>
  deleteScheduledTransaction: (id: string) => Promise<void>
  getCategory: (id: string) => Category | undefined
  getTotalIncome: (month?: string) => number
  getTotalExpenses: (month?: string) => number
  getBalance: (month?: string) => number
  getUpcomingBills: () => FixedBill[]
  getUpcomingScheduled: () => ScheduledTransaction[]
  addInvestment: (investment: Investment) => Promise<void>
  updateInvestment: (investment: Investment) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>
  initialBalance: number
  setInitialBalance: (value: number) => Promise<void>
  budgets: Budget[]
  ccPurchases: CreditCardPurchase[]
  ccInstallments: CreditCardInstallment[]
  addCCPurchase: (purchase: Omit<CreditCardPurchase, "id" | "createdAt">, installments: number) => Promise<void>
  payCCInvoice: (cardId: string, month: string, totalAmount: number, cardName?: string) => Promise<void>
  deleteCCPurchase: (purchaseId: string) => Promise<void>
  addBudget: (b: Omit<Budget, "id">) => Promise<void>
  updateBudget: (b: Budget) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  investmentTransactions: InvestmentTransaction[]
  addInvestmentTransaction: (t: Omit<InvestmentTransaction, "id">) => Promise<void>
  deleteInvestmentTransaction: (id: string) => Promise<void>
  creditCards: CreditCard[]
  addCreditCard: (card: CreditCard) => Promise<void>
  updateCreditCard: (card: CreditCard) => Promise<void>
  deleteCreditCard: (id: string) => Promise<void>
  signOut: () => Promise<void>
}

const FinanceContext = React.createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), [])
  const { activeClientId } = useConsultant()
  const targetUserIdRef = React.useRef<string>("")

  const [user, setUser] = React.useState<User | null>(null)
  const [data, setData] = React.useState<FinancialData>({
    transactions: [],
    categories: [],
    goals: [],
    fixedBills: [],
    scheduledTransactions: [],
    investments: [],
    creditCards: [],
    investmentTransactions: [],
    budgets: [],
    ccPurchases: [],
    ccInstallments: [],
  })
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [initialBalance, setInitialBalanceState] = React.useState(0)

  const loadData = React.useCallback(async (userId: string) => {
    const [cats, txs, goals, bills, scheduled, invs, cards, invTxs, budgets, ccPurchases, ccInstallments] = await Promise.all([
      supabase.from("categories").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("fixed_bills").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("scheduled_transactions").select("*").eq("user_id", userId).order("scheduled_date"),
      supabase.from("investments").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("credit_cards").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("investment_transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase.from("credit_card_purchases").select("*").eq("user_id", userId).order("purchase_date", { ascending: false }),
      supabase.from("credit_card_installments").select("*, credit_card_purchases(*)").eq("user_id", userId),
    ])

    setData({
      categories: (cats.data ?? []).map(mapCategory),
      transactions: (txs.data ?? []).map(mapTransaction),
      goals: (goals.data ?? []).map(mapGoal),
      fixedBills: (bills.data ?? []).map(mapFixedBill),
      scheduledTransactions: (scheduled.data ?? []).map(mapScheduledTransaction),
      investments: (invs.data ?? []).map(mapInvestment),
      creditCards: (cards.data ?? []).map(mapCreditCard),
      investmentTransactions: (invTxs.data ?? []).map(mapInvestmentTransaction),
      budgets: (budgets.data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, categoryId: r.category_id as string, amount: Number(r.amount), month: r.month as string })),
      ccPurchases: (ccPurchases.data ?? []).map((r: any) => ({
        id: r.id, creditCardId: r.credit_card_id, description: r.description,
        totalAmount: Number(r.total_amount), installments: r.installments,
        categoryId: r.category_id, purchaseDate: r.purchase_date, notes: r.notes, createdAt: r.created_at,
      })),
      ccInstallments: (ccInstallments.data ?? []).map((r: any) => {
        const p = Array.isArray(r.credit_card_purchases) ? r.credit_card_purchases[0] : r.credit_card_purchases
        return {
          id: r.id, purchaseId: r.purchase_id, creditCardId: r.credit_card_id,
          installmentNum: r.installment_num, dueMonth: r.due_month,
          amount: Number(r.amount), isPaid: r.is_paid, paidAt: r.paid_at,
          transactionId: r.transaction_id,
          purchase: p ? {
            id: p.id, creditCardId: p.credit_card_id,
            description: p.description, totalAmount: Number(p.total_amount),
            installments: p.installments, categoryId: p.category_id,
            purchaseDate: p.purchase_date, notes: p.notes,
            createdAt: p.created_at,
          } : undefined,
        }
      }),
    })

    // Load initial balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("initial_balance")
      .eq("id", userId)
      .single()
    if (profile?.initial_balance) setInitialBalanceState(Number(profile.initial_balance))

    setIsLoaded(true)
  }, [supabase])

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadData(user.id)
      else setIsLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadData(u.id)
    })

    return () => subscription.unsubscribe()
  }, [supabase, loadData])

  // Recarrega dados quando consultor muda de cliente
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u) {
        const targetId = activeClientId || u.id
        targetUserIdRef.current = targetId
        loadData(targetId)
      }
    })
  }, [activeClientId])

  const addTransaction = React.useCallback(async (t: Transaction) => {
    if (!user) return
    console.log('addTransaction called with status:', t.status, 'date:', t.date)
    const { data: row, error } = await supabase.from("transactions").insert({
      user_id: targetUserIdRef.current || user!.id, description: t.description, amount: t.amount,
      type: t.type, category_id: t.categoryId || null, date: t.date, notes: t.notes ?? null,
      wallet: t.wallet ?? "digital",
      status: t.status ?? "completed",
      installment_number: t.installmentNumber ?? null,
      total_installments: t.totalInstallments ?? null,
      installment_group_id: t.installmentGroupId ?? null,
    }).select().single()
    if (error) { toast.error("Erro ao salvar transação."); return }
    if (row) {
      setData(prev => ({ ...prev, transactions: [mapTransaction(row), ...prev.transactions] }))
      toast.success("Transação salva!")
    }
  }, [user, supabase])

  const updateTransaction = React.useCallback(async (t: Transaction) => {
    const { data: row } = await supabase.from("transactions").update({
      description: t.description, amount: t.amount, type: t.type,
      category_id: t.categoryId || null, date: t.date, notes: t.notes ?? null,
      wallet: t.wallet ?? "digital",
      status: t.status ?? "completed",
    }).eq("id", t.id).select().single()
    if (row) setData(prev => ({ ...prev, transactions: prev.transactions.map(x => x.id === t.id ? mapTransaction(row) : x) }))
  }, [supabase])

  const deleteTransaction = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover transação."); return }
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }))
    toast.success("Transação removida!")
  }, [supabase])

  const addCategory = React.useCallback(async (c: Category) => {
    if (!user) return
    const { data: row } = await supabase.from("categories").insert({
      user_id: targetUserIdRef.current || user!.id, name: c.name, icon: c.icon, color: c.color, type: c.type,
    }).select().single()
    if (row) setData(prev => ({ ...prev, categories: [...prev.categories, mapCategory(row)] }))
  }, [user, supabase])

  const deleteCategory = React.useCallback(async (id: string) => {
    await supabase.from("categories").delete().eq("id", id)
    setData(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }))
  }, [supabase])

  const addGoal = React.useCallback(async (g: Goal) => {
    if (!user) return
    const { data: row, error } = await supabase.from("goals").insert({
      user_id: targetUserIdRef.current || user!.id, name: g.name, target_amount: g.targetAmount,
      current_amount: g.currentAmount, deadline: g.deadline, color: g.color,
    }).select().single()
    if (error) { toast.error("Erro ao salvar meta."); return }
    if (row) {
      setData(prev => ({ ...prev, goals: [...prev.goals, mapGoal(row)] }))
      toast.success("Meta criada!")
    }
  }, [user, supabase])

  const updateGoal = React.useCallback(async (g: Goal) => {
    const { data: row } = await supabase.from("goals").update({
      name: g.name, target_amount: g.targetAmount, current_amount: g.currentAmount,
      deadline: g.deadline, color: g.color,
    }).eq("id", g.id).select().single()
    if (row) setData(prev => ({ ...prev, goals: prev.goals.map(x => x.id === g.id ? mapGoal(row) : x) }))
  }, [supabase])

  const deleteGoal = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover meta."); return }
    setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }))
    toast.success("Meta removida!")
  }, [supabase])

  const addFixedBill = React.useCallback(async (b: FixedBill) => {
    if (!user) return
    const { data: row } = await supabase.from("fixed_bills").insert({
      user_id: targetUserIdRef.current || user!.id, description: b.description, amount: b.amount, type: b.type,
      category_id: b.categoryId || null, due_day: b.dueDay, recurrence: b.recurrence,
      is_active: b.isActive, notes: b.notes ?? null,
      total_installments: b.totalInstallments ?? null,
      current_installment: b.totalInstallments ? 1 : null,
      start_date: b.startDate ?? null,
    }).select().single()
    if (row) {
      const newBill = mapFixedBill(row)

      // Se for parcelado, cria os lançamentos futuros automaticamente
      if (b.totalInstallments && b.startDate) {
        const installments = []
        for (let i = 0; i < b.totalInstallments; i++) {
          const date = new Date(b.startDate)
          date.setMonth(date.getMonth() + i)
          const dateStr = date.toISOString().split("T")[0]
          installments.push({
            user_id: targetUserIdRef.current || user!.id,
            description: `${b.description} (${i + 1}/${b.totalInstallments})`,
            amount: b.amount,
            type: b.type,
            category_id: b.categoryId || null,
            scheduled_date: dateStr,
            is_completed: false,
            notes: b.notes ?? null,
            fixed_bill_id: row.id,
            installment_number: i + 1,
          })
        }
        const { data: scheduled } = await supabase.from("scheduled_transactions").insert(installments).select()
        setData(prev => ({
          ...prev,
          fixedBills: [...prev.fixedBills, newBill],
          scheduledTransactions: [...prev.scheduledTransactions, ...(scheduled ?? []).map(mapScheduledTransaction)],
        }))
      } else {
        setData(prev => ({ ...prev, fixedBills: [...prev.fixedBills, newBill] }))
        toast.success("Conta fixa salva!")
      }
    }
  }, [user, supabase])

  const updateFixedBill = React.useCallback(async (b: FixedBill) => {
    const { data: row } = await supabase.from("fixed_bills").update({
      description: b.description, amount: b.amount, type: b.type,
      category_id: b.categoryId || null, due_day: b.dueDay, recurrence: b.recurrence,
      is_active: b.isActive, notes: b.notes ?? null,
    }).eq("id", b.id).select().single()
    if (row) setData(prev => ({ ...prev, fixedBills: prev.fixedBills.map(x => x.id === b.id ? mapFixedBill(row) : x) }))
  }, [supabase])

  const deleteFixedBill = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("fixed_bills").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover conta fixa."); return }
    setData(prev => ({ ...prev, fixedBills: prev.fixedBills.filter(b => b.id !== id) }))
    toast.success("Conta fixa removida!")
  }, [supabase])

  const addScheduledTransaction = React.useCallback(async (t: ScheduledTransaction) => {
    if (!user) return
    const { data: row } = await supabase.from("scheduled_transactions").insert({
      user_id: targetUserIdRef.current || user!.id, description: t.description, amount: t.amount, type: t.type,
      category_id: t.categoryId || null, scheduled_date: t.scheduledDate,
      is_completed: t.isCompleted, notes: t.notes ?? null,
      credit_card_id: t.creditCardId ?? null,
      installment_number: t.installmentNumber ?? null,
      total_installments: t.totalInstallments ?? null,
    }).select().single()
    if (row) setData(prev => ({ ...prev, scheduledTransactions: [...prev.scheduledTransactions, mapScheduledTransaction(row)] }))
  }, [user, supabase])

  const updateScheduledTransaction = React.useCallback(async (t: ScheduledTransaction) => {
    const { data: row } = await supabase.from("scheduled_transactions").update({
      description: t.description, amount: t.amount, type: t.type,
      category_id: t.categoryId || null, scheduled_date: t.scheduledDate,
      is_completed: t.isCompleted, notes: t.notes ?? null,
      credit_card_id: t.creditCardId ?? null,
    }).eq("id", t.id).select().single()
    if (row) setData(prev => ({ ...prev, scheduledTransactions: prev.scheduledTransactions.map(x => x.id === t.id ? mapScheduledTransaction(row) : x) }))
  }, [supabase])

  const deleteScheduledTransaction = React.useCallback(async (id: string) => {
    await supabase.from("scheduled_transactions").delete().eq("id", id)
    setData(prev => ({ ...prev, scheduledTransactions: prev.scheduledTransactions.filter(t => t.id !== id) }))
  }, [supabase])

  const getCategory = React.useCallback((id: string) => data.categories.find(c => c.id === id), [data.categories])

  const getTotalIncome = React.useCallback((month?: string) =>
    data.transactions
      .filter(t => t.type === "income" && (!month || t.date.startsWith(month)))
      .reduce((s, t) => s + t.amount, 0)
  , [data.transactions])

  const getTotalExpenses = React.useCallback((month?: string) =>
    data.transactions
      .filter(t => t.type === "expense" && (!month || t.date.startsWith(month)))
      .reduce((s, t) => s + t.amount, 0)
  , [data.transactions])

  const getBalance = React.useCallback((month?: string) => getTotalIncome(month) - getTotalExpenses(month) + (month ? 0 : initialBalance), [getTotalIncome, getTotalExpenses, initialBalance])

  const getUpcomingBills = React.useCallback(() => {
    const today = new Date()
    return data.fixedBills.filter(b => {
      if (!b.isActive) return false
      const dueDate = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1)
      return (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7
    })
  }, [data.fixedBills])

  const getUpcomingScheduled = React.useCallback(() => {
    const today = new Date().toISOString().split("T")[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
    return data.scheduledTransactions.filter(t => !t.isCompleted && t.scheduledDate >= today && t.scheduledDate <= nextWeek)
  }, [data.scheduledTransactions])


  const addInvestment = React.useCallback(async (inv: Investment) => {
    if (!user) return
    const { data: row, error } = await supabase.from("investments").insert({
      user_id: targetUserIdRef.current || user!.id, name: inv.name, ticker: inv.ticker,
      asset_type: inv.assetType, quantity: inv.quantity,
      avg_price: inv.avgPrice, notes: inv.notes ?? null,
      invested_amount: inv.investedAmount ?? null,
      invested_at: inv.investedAt ?? null,
      rate: inv.rate ?? null,
      rate_index: inv.rateIndex ?? null,
      maturity_date: inv.maturityDate ?? null,
    }).select().single()
    if (error) { toast.error("Erro ao salvar investimento."); return }
    if (row) {
      setData(prev => ({ ...prev, investments: [...prev.investments, mapInvestment(row)] }))
      toast.success("Investimento salvo!")
    }
  }, [user, supabase])

  const updateInvestment = React.useCallback(async (inv: Investment) => {
    const { data: row } = await supabase.from("investments").update({
      name: inv.name, ticker: inv.ticker, asset_type: inv.assetType,
      quantity: inv.quantity, avg_price: inv.avgPrice, notes: inv.notes ?? null,
      invested_amount: inv.investedAmount ?? null,
      invested_at: inv.investedAt ?? null,
      rate: inv.rate ?? null,
      rate_index: inv.rateIndex ?? null,
      maturity_date: inv.maturityDate ?? null,
    }).eq("id", inv.id).select().single()
    if (row) setData(prev => ({ ...prev, investments: prev.investments.map(x => x.id === inv.id ? mapInvestment(row) : x) }))
  }, [supabase])

  const deleteInvestment = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("investments").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover investimento."); return }
    setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) }))
    toast.success("Investimento removido!")
  }, [supabase])

  const setInitialBalance = React.useCallback(async (value: number) => {
    if (!user) return
    await supabase.from("profiles").upsert({ id: user.id, initial_balance: value })
    setInitialBalanceState(value)
  }, [user, supabase])

  const addCCPurchase = React.useCallback(async (purchase: Omit<CreditCardPurchase, "id" | "createdAt">, installments: number) => {
    if (!user) return
    const userId = targetUserIdRef.current || user.id

    // Insert purchase
    const { data: pRow } = await supabase.from("credit_card_purchases").insert({
      user_id: userId, credit_card_id: purchase.creditCardId,
      description: purchase.description, total_amount: purchase.totalAmount,
      installments, category_id: purchase.categoryId || null,
      purchase_date: purchase.purchaseDate, notes: purchase.notes ?? null,
    }).select().single()

    if (!pRow) return

    // Insert installments
    const instRows = []
    for (let i = 1; i <= installments; i++) {
      const [year, month] = purchase.purchaseDate.split("-").map(Number)
      const d = new Date(year, month - 1 + (i - 1), 1)
      const dueMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      instRows.push({
        purchase_id: pRow.id, user_id: userId,
        credit_card_id: purchase.creditCardId,
        installment_num: i, due_month: dueMonth,
        amount: Math.round((purchase.totalAmount / installments) * 100) / 100,
        is_paid: false,
      })
    }

    const { data: instData } = await supabase.from("credit_card_installments").insert(instRows).select("*, credit_card_purchases(*)")

    const newPurchase: CreditCardPurchase = {
      id: pRow.id, creditCardId: pRow.credit_card_id, description: pRow.description,
      totalAmount: Number(pRow.total_amount), installments: pRow.installments,
      categoryId: pRow.category_id, purchaseDate: pRow.purchase_date,
      notes: pRow.notes, createdAt: pRow.created_at,
    }

    const newInstallments: CreditCardInstallment[] = (instData ?? []).map((r: any) => ({
      id: r.id, purchaseId: r.purchase_id, creditCardId: r.credit_card_id,
      installmentNum: r.installment_num, dueMonth: r.due_month,
      amount: Number(r.amount), isPaid: false, purchase: newPurchase,
    }))

    setData(prev => ({
      ...prev,
      ccPurchases: [newPurchase, ...prev.ccPurchases],
      ccInstallments: [...prev.ccInstallments, ...newInstallments],
    }))
  }, [user, supabase])

  const payCCInvoice = React.useCallback(async (cardId: string, month: string, totalAmount: number, cardName?: string) => {
    if (!user) return
    const userId = targetUserIdRef.current || user.id

    // Create transaction for total
    const { data: txRow } = await supabase.from("transactions").insert({
      user_id: userId,
      description: cardName ? `Fatura ${cardName}` : `Fatura cartão`,
      amount: totalAmount,
      type: "expense",
      category_id: null,
      date: new Date().toISOString().split("T")[0],
      wallet: "digital",
    }).select().single()

    if (!txRow) return

    // Mark installments as paid
    await supabase.from("credit_card_installments")
      .update({ is_paid: true, paid_at: new Date().toISOString(), transaction_id: txRow.id })
      .eq("credit_card_id", cardId)
      .eq("due_month", month)
      .eq("is_paid", false)

    // Update state
    const newTx = {
      id: txRow.id, description: txRow.description, amount: Number(txRow.amount),
      type: txRow.type as "income" | "expense" | "transfer", categoryId: txRow.category_id ?? "",
      date: txRow.date, wallet: (txRow.wallet ?? "digital") as "digital" | "cash",
    }

    setData(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      ccInstallments: prev.ccInstallments.map((inst: CreditCardInstallment) =>
        inst.creditCardId === cardId && inst.dueMonth === month && !inst.isPaid
          ? { ...inst, isPaid: true, paidAt: new Date().toISOString(), transactionId: txRow.id }
          : inst
      ),
    }))
  }, [user, supabase])

  const deleteCCPurchase = React.useCallback(async (purchaseId: string) => {
    await supabase.from("credit_card_purchases").delete().eq("id", purchaseId)
    setData(prev => ({
      ...prev,
      ccPurchases: prev.ccPurchases.filter((p: CreditCardPurchase) => p.id !== purchaseId),
      ccInstallments: prev.ccInstallments.filter((i: CreditCardInstallment) => i.purchaseId !== purchaseId),
    }))
  }, [supabase])

  const confirmTransaction = React.useCallback(async (id: string) => {
    await supabase.from("transactions").update({ status: "completed" }).eq("id", id)
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, status: "completed" as const } : t)
    }))
  }, [supabase])

  const addBudget = React.useCallback(async (b: Omit<Budget, "id">) => {
    if (!user) return
    const { data: row } = await supabase.from("budgets").upsert({
      user_id: targetUserIdRef.current || user!.id, category_id: b.categoryId, amount: b.amount, month: b.month
    }, { onConflict: "user_id,category_id,month" }).select().single()
    if (row) setData(prev => {
      const exists = prev.budgets.find(x => x.id === row.id)
      const budget = { id: row.id as string, categoryId: row.category_id as string, amount: Number(row.amount), month: row.month as string }
      return { ...prev, budgets: exists ? prev.budgets.map(x => x.id === row.id ? budget : x) : [...prev.budgets, budget] }
    })
  }, [user, supabase])

  const updateBudget = React.useCallback(async (b: Budget) => {
    const { data: row } = await supabase.from("budgets").update({ amount: b.amount }).eq("id", b.id).select().single()
    if (row) setData(prev => ({ ...prev, budgets: prev.budgets.map(x => x.id === b.id ? { ...x, amount: Number(row.amount) } : x) }))
  }, [supabase])

  const deleteBudget = React.useCallback(async (id: string) => {
    await supabase.from("budgets").delete().eq("id", id)
    setData(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }))
  }, [supabase])

  const addInvestmentTransaction = React.useCallback(async (t: Omit<InvestmentTransaction, "id">) => {
    if (!user) return
    const { data: row, error } = await supabase.from("investment_transactions").insert({
      user_id: targetUserIdRef.current || user!.id,
      investment_id: t.investmentId,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      total: t.total,
      date: t.date,
      notes: t.notes ?? null,
    }).select().single()
    if (error) { toast.error("Erro ao salvar movimentação."); return }
    if (row) {
      const newTx = mapInvestmentTransaction(row)
      setData(prev => {
        const allTxs = [newTx, ...prev.investmentTransactions.filter((x: InvestmentTransaction) => x.investmentId === t.investmentId)]
        const inv = prev.investments.find((i: Investment) => i.id === t.investmentId)
        if (inv) {
          const buys = allTxs.filter((x: InvestmentTransaction) => x.type === "buy")
          const sells = allTxs.filter((x: InvestmentTransaction) => x.type === "sell")
          const totalQty = buys.reduce((s: number, x: InvestmentTransaction) => s + x.quantity, 0) - sells.reduce((s: number, x: InvestmentTransaction) => s + x.quantity, 0)
          const totalInvested = buys.reduce((s: number, x: InvestmentTransaction) => s + x.total, 0)
          const avgPrice = totalQty > 0 ? totalInvested / totalQty : 0
          supabase.from("investments").update({ quantity: totalQty, avg_price: avgPrice, invested_amount: totalInvested }).eq("id", inv.id)
          const updatedInvestments = prev.investments.map((i: Investment) => i.id === inv.id ? { ...i, quantity: totalQty, avgPrice, investedAmount: totalInvested } : i)
          return { ...prev, investmentTransactions: [newTx, ...prev.investmentTransactions], investments: updatedInvestments }
        }
        return { ...prev, investmentTransactions: [newTx, ...prev.investmentTransactions] }
      })
      toast.success(t.type === "buy" ? "Compra registrada!" : "Venda registrada!")
    }
  }, [user, supabase])

  const deleteInvestmentTransaction = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("investment_transactions").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover movimentação."); return }
    setData(prev => ({ ...prev, investmentTransactions: prev.investmentTransactions.filter(t => t.id !== id) }))
    toast.success("Movimentação removida!")
  }, [supabase])

  const addCreditCard = React.useCallback(async (card: CreditCard) => {
    if (!user) return
    const { data: row, error } = await supabase.from("credit_cards").insert({
      user_id: targetUserIdRef.current || user!.id, name: card.name, limit_amount: card.limitAmount,
      due_day: card.dueDay, closing_day: card.closingDay,
      color: card.color, is_active: card.isActive,
    }).select().single()
    if (error) { toast.error("Erro ao salvar cartão."); return }
    if (row) {
      setData(prev => ({ ...prev, creditCards: [...prev.creditCards, mapCreditCard(row)] }))
      toast.success("Cartão adicionado!")
    }
  }, [user, supabase])

  const updateCreditCard = React.useCallback(async (card: CreditCard) => {
    const { data: row, error } = await supabase.from("credit_cards").update({
      name: card.name, limit_amount: card.limitAmount,
      due_day: card.dueDay, closing_day: card.closingDay,
      color: card.color, is_active: card.isActive,
    }).eq("id", card.id).select().single()
    if (error) { toast.error("Erro ao atualizar cartão."); return }
    if (row) setData(prev => ({ ...prev, creditCards: prev.creditCards.map(x => x.id === card.id ? mapCreditCard(row) : x) }))
  }, [supabase])

  const deleteCreditCard = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("credit_cards").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover cartão."); return }
    setData(prev => ({ ...prev, creditCards: prev.creditCards.filter(c => c.id !== id) }))
    toast.success("Cartão removido!")
  }, [supabase])

  const signOut = React.useCallback(async () => { await supabase.auth.signOut() }, [supabase])

  return (
    <FinanceContext.Provider value={{
      data, isLoaded, user,
      addTransaction, updateTransaction, deleteTransaction, confirmTransaction,
      addCategory, deleteCategory,
      addGoal, updateGoal, deleteGoal,
      addFixedBill, updateFixedBill, deleteFixedBill,
      addScheduledTransaction, updateScheduledTransaction, deleteScheduledTransaction,
      getCategory, getTotalIncome, getTotalExpenses, getBalance,
      getUpcomingBills, getUpcomingScheduled, signOut,
      initialBalance, setInitialBalance,
      creditCards: data.creditCards,
      budgets: data.budgets ?? [],
      addBudget, updateBudget, deleteBudget,
      ccPurchases: data.ccPurchases ?? [],
      ccInstallments: data.ccInstallments ?? [],
      addCCPurchase, payCCInvoice, deleteCCPurchase,
      investmentTransactions: data.investmentTransactions ?? [],
      addInvestmentTransaction, deleteInvestmentTransaction,
      addCreditCard, updateCreditCard, deleteCreditCard,
      addInvestment, updateInvestment, deleteInvestment,
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = React.useContext(FinanceContext)
  if (!context) throw new Error("useFinance must be used within FinanceProvider")
  return context
}