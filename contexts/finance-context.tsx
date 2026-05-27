"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FinancialData,
  Transaction,
  Category,
  Goal,
  FixedBill,
  ScheduledTransaction,
  Investment,
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
  }
}

function mapInvestment(row: Record<string, unknown>): Investment {
  return {
    id: row.id as string,
    name: row.name as string,
    ticker: row.ticker as string,
    assetType: row.asset_type as Investment["assetType"],
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    notes: row.notes as string | undefined,
  }
}

interface FinanceContextType {
  data: FinancialData
  isLoaded: boolean
  user: User | null
  addTransaction: (transaction: Transaction) => Promise<void>
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
  signOut: () => Promise<void>
}

const FinanceContext = React.createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), [])

  const [user, setUser] = React.useState<User | null>(null)
  const [data, setData] = React.useState<FinancialData>({
    transactions: [],
    categories: [],
    goals: [],
    fixedBills: [],
    scheduledTransactions: [],
    investments: [],
  })
  const [isLoaded, setIsLoaded] = React.useState(false)

  const loadData = React.useCallback(async (userId: string) => {
    const [cats, txs, goals, bills, scheduled, invs] = await Promise.all([
      supabase.from("categories").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("fixed_bills").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("scheduled_transactions").select("*").eq("user_id", userId).order("scheduled_date"),
      supabase.from("investments").select("*").eq("user_id", userId).order("created_at"),
    ])

    setData({
      categories: (cats.data ?? []).map(mapCategory),
      transactions: (txs.data ?? []).map(mapTransaction),
      goals: (goals.data ?? []).map(mapGoal),
      fixedBills: (bills.data ?? []).map(mapFixedBill),
      scheduledTransactions: (scheduled.data ?? []).map(mapScheduledTransaction),
      investments: (invs.data ?? []).map(mapInvestment),
    })
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

  const addTransaction = React.useCallback(async (t: Transaction) => {
    if (!user) return
    const { data: row, error } = await supabase.from("transactions").insert({
      user_id: user.id, description: t.description, amount: t.amount,
      type: t.type, category_id: t.categoryId || null, date: t.date, notes: t.notes ?? null,
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
      user_id: user.id, name: c.name, icon: c.icon, color: c.color, type: c.type,
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
      user_id: user.id, name: g.name, target_amount: g.targetAmount,
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
      user_id: user.id, description: b.description, amount: b.amount, type: b.type,
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
            user_id: user.id,
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
      user_id: user.id, description: t.description, amount: t.amount, type: t.type,
      category_id: t.categoryId || null, scheduled_date: t.scheduledDate,
      is_completed: t.isCompleted, notes: t.notes ?? null,
    }).select().single()
    if (row) setData(prev => ({ ...prev, scheduledTransactions: [...prev.scheduledTransactions, mapScheduledTransaction(row)] }))
  }, [user, supabase])

  const updateScheduledTransaction = React.useCallback(async (t: ScheduledTransaction) => {
    const { data: row } = await supabase.from("scheduled_transactions").update({
      description: t.description, amount: t.amount, type: t.type,
      category_id: t.categoryId || null, scheduled_date: t.scheduledDate,
      is_completed: t.isCompleted, notes: t.notes ?? null,
    }).eq("id", t.id).select().single()
    if (row) setData(prev => ({ ...prev, scheduledTransactions: prev.scheduledTransactions.map(x => x.id === t.id ? mapScheduledTransaction(row) : x) }))
  }, [supabase])

  const deleteScheduledTransaction = React.useCallback(async (id: string) => {
    await supabase.from("scheduled_transactions").delete().eq("id", id)
    setData(prev => ({ ...prev, scheduledTransactions: prev.scheduledTransactions.filter(t => t.id !== id) }))
  }, [supabase])

  const getCategory = React.useCallback((id: string) => data.categories.find(c => c.id === id), [data.categories])

  const getTotalIncome = React.useCallback((month?: string) => {
    // Transações manuais
    const txIncome = data.transactions
      .filter(t => t.type === "income" && (!month || t.date.startsWith(month)))
      .reduce((s, t) => s + t.amount, 0)

    // Contas fixas ativas do tipo receita
    const fixedIncome = data.fixedBills
      .filter(b => b.isActive && b.type === "income")
      .reduce((s, b) => s + b.amount, 0)

    // Lançamentos futuros concluídos do tipo receita no mês
    const scheduledIncome = data.scheduledTransactions
      .filter(t => t.isCompleted && t.type === "income" && (!month || t.scheduledDate.startsWith(month)))
      .reduce((s, t) => s + t.amount, 0)

    return txIncome + fixedIncome + scheduledIncome
  }, [data.transactions, data.fixedBills, data.scheduledTransactions])

  const getTotalExpenses = React.useCallback((month?: string) => {
    // Transações manuais
    const txExpenses = data.transactions
      .filter(t => t.type === "expense" && (!month || t.date.startsWith(month)))
      .reduce((s, t) => s + t.amount, 0)

    // Contas fixas ativas do tipo despesa
    const fixedExpenses = data.fixedBills
      .filter(b => b.isActive && b.type === "expense")
      .reduce((s, b) => s + b.amount, 0)

    // Lançamentos futuros concluídos do tipo despesa no mês
    const scheduledExpenses = data.scheduledTransactions
      .filter(t => t.isCompleted && t.type === "expense" && (!month || t.scheduledDate.startsWith(month)))
      .reduce((s, t) => s + t.amount, 0)

    return txExpenses + fixedExpenses + scheduledExpenses
  }, [data.transactions, data.fixedBills, data.scheduledTransactions])

  const getBalance = React.useCallback((month?: string) => getTotalIncome(month) - getTotalExpenses(month), [getTotalIncome, getTotalExpenses])

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
    const { data: row } = await supabase.from("investments").insert({
      user_id: user.id, name: inv.name, ticker: inv.ticker,
      asset_type: inv.assetType, quantity: inv.quantity,
      avg_price: inv.avgPrice, notes: inv.notes ?? null,
    }).select().single()
    if (row) setData(prev => ({ ...prev, investments: [...prev.investments, mapInvestment(row)] }))
  }, [user, supabase])

  const updateInvestment = React.useCallback(async (inv: Investment) => {
    const { data: row } = await supabase.from("investments").update({
      name: inv.name, ticker: inv.ticker, asset_type: inv.assetType,
      quantity: inv.quantity, avg_price: inv.avgPrice, notes: inv.notes ?? null,
    }).eq("id", inv.id).select().single()
    if (row) setData(prev => ({ ...prev, investments: prev.investments.map(x => x.id === inv.id ? mapInvestment(row) : x) }))
  }, [supabase])

  const deleteInvestment = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("investments").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover investimento."); return }
    setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) }))
    toast.success("Investimento removido!")
  }, [supabase])

  const signOut = React.useCallback(async () => { await supabase.auth.signOut() }, [supabase])

  return (
    <FinanceContext.Provider value={{
      data, isLoaded, user,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, deleteCategory,
      addGoal, updateGoal, deleteGoal,
      addFixedBill, updateFixedBill, deleteFixedBill,
      addScheduledTransaction, updateScheduledTransaction, deleteScheduledTransaction,
      getCategory, getTotalIncome, getTotalExpenses, getBalance,
      getUpcomingBills, getUpcomingScheduled, signOut,
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