"use client"

import * as React from "react"
import { FinancialData, Transaction, Category, Goal, FixedBill, ScheduledTransaction } from "@/lib/types"
import {
  getInitialData,
  addTransaction as addTx,
  updateTransaction as updateTx,
  deleteTransaction as deleteTx,
  addCategory as addCat,
  deleteCategory as deleteCat,
  addGoal as addG,
  updateGoal as updateG,
  deleteGoal as deleteG,
  addFixedBill as addFB,
  updateFixedBill as updateFB,
  deleteFixedBill as deleteFB,
  addScheduledTransaction as addST,
  updateScheduledTransaction as updateST,
  deleteScheduledTransaction as deleteST,
} from "@/lib/storage"

interface FinanceContextType {
  data: FinancialData
  isLoaded: boolean
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (transaction: Transaction) => void
  deleteTransaction: (id: string) => void
  addCategory: (category: Category) => void
  deleteCategory: (id: string) => void
  addGoal: (goal: Goal) => void
  updateGoal: (goal: Goal) => void
  deleteGoal: (id: string) => void
  addFixedBill: (bill: FixedBill) => void
  updateFixedBill: (bill: FixedBill) => void
  deleteFixedBill: (id: string) => void
  addScheduledTransaction: (transaction: ScheduledTransaction) => void
  updateScheduledTransaction: (transaction: ScheduledTransaction) => void
  deleteScheduledTransaction: (id: string) => void
  getCategory: (id: string) => Category | undefined
  getTotalIncome: (month?: string) => number
  getTotalExpenses: (month?: string) => number
  getBalance: (month?: string) => number
  getUpcomingBills: () => FixedBill[]
  getUpcomingScheduled: () => ScheduledTransaction[]
}

const FinanceContext = React.createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<FinancialData>({
    transactions: [],
    categories: [],
    goals: [],
    fixedBills: [],
    scheduledTransactions: [],
  })
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    setData(getInitialData())
    setIsLoaded(true)
  }, [])

  const addTransaction = React.useCallback((transaction: Transaction) => {
    setData((prev) => addTx(prev, transaction))
  }, [])

  const updateTransaction = React.useCallback((transaction: Transaction) => {
    setData((prev) => updateTx(prev, transaction))
  }, [])

  const deleteTransaction = React.useCallback((id: string) => {
    setData((prev) => deleteTx(prev, id))
  }, [])

  const addCategory = React.useCallback((category: Category) => {
    setData((prev) => addCat(prev, category))
  }, [])

  const deleteCategory = React.useCallback((id: string) => {
    setData((prev) => deleteCat(prev, id))
  }, [])

  const addGoal = React.useCallback((goal: Goal) => {
    setData((prev) => addG(prev, goal))
  }, [])

  const updateGoal = React.useCallback((goal: Goal) => {
    setData((prev) => updateG(prev, goal))
  }, [])

  const deleteGoal = React.useCallback((id: string) => {
    setData((prev) => deleteG(prev, id))
  }, [])

  const addFixedBill = React.useCallback((bill: FixedBill) => {
    setData((prev) => addFB(prev, bill))
  }, [])

  const updateFixedBill = React.useCallback((bill: FixedBill) => {
    setData((prev) => updateFB(prev, bill))
  }, [])

  const deleteFixedBill = React.useCallback((id: string) => {
    setData((prev) => deleteFB(prev, id))
  }, [])

  const addScheduledTransaction = React.useCallback((transaction: ScheduledTransaction) => {
    setData((prev) => addST(prev, transaction))
  }, [])

  const updateScheduledTransaction = React.useCallback((transaction: ScheduledTransaction) => {
    setData((prev) => updateST(prev, transaction))
  }, [])

  const deleteScheduledTransaction = React.useCallback((id: string) => {
    setData((prev) => deleteST(prev, id))
  }, [])

  const getCategory = React.useCallback(
    (id: string) => data.categories.find((c) => c.id === id),
    [data.categories]
  )

  const filterByMonth = React.useCallback(
    (transactions: Transaction[], month?: string) => {
      if (!month) return transactions
      return transactions.filter((t) => t.date.startsWith(month))
    },
    []
  )

  const getFixedBillsForMonth = React.useCallback(
    (month?: string) => {
      if (!month) return data.fixedBills.filter((b) => b.isActive)
      
      const [year, monthNum] = month.split("-").map(Number)
      const today = new Date()
      const targetDate = new Date(year, monthNum - 1, 1)
      
      return data.fixedBills.filter((b) => {
        if (!b.isActive) return false
        
        // Para meses futuros ou atual, inclui contas fixas ativas
        if (targetDate >= new Date(today.getFullYear(), today.getMonth(), 1)) {
          return true
        }
        
        // Para meses passados, assume que as contas fixas existiam
        return true
      })
    },
    [data.fixedBills]
  )

  const getTotalIncome = React.useCallback(
    (month?: string) => {
      const filteredTransactions = filterByMonth(data.transactions, month)
      const transactionIncome = filteredTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0)
      
      const fixedIncome = getFixedBillsForMonth(month)
        .filter((b) => b.type === "income")
        .reduce((sum, b) => sum + b.amount, 0)
      
      return transactionIncome + fixedIncome
    },
    [data.transactions, filterByMonth, getFixedBillsForMonth]
  )

  const getTotalExpenses = React.useCallback(
    (month?: string) => {
      const filteredTransactions = filterByMonth(data.transactions, month)
      const transactionExpenses = filteredTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
      
      const fixedExpenses = getFixedBillsForMonth(month)
        .filter((b) => b.type === "expense")
        .reduce((sum, b) => sum + b.amount, 0)
      
      return transactionExpenses + fixedExpenses
    },
    [data.transactions, filterByMonth, getFixedBillsForMonth]
  )

  const getBalance = React.useCallback(
    (month?: string) => getTotalIncome(month) - getTotalExpenses(month),
    [getTotalIncome, getTotalExpenses]
  )

  const getUpcomingBills = React.useCallback(() => {
    const today = new Date()
    const currentDay = today.getDate()
    return data.fixedBills
      .filter((b) => b.isActive)
      .sort((a, b) => {
        const aDays = a.dueDay >= currentDay ? a.dueDay - currentDay : 30 - currentDay + a.dueDay
        const bDays = b.dueDay >= currentDay ? b.dueDay - currentDay : 30 - currentDay + b.dueDay
        return aDays - bDays
      })
  }, [data.fixedBills])

  const getUpcomingScheduled = React.useCallback(() => {
    const today = new Date().toISOString().split("T")[0]
    return data.scheduledTransactions
      .filter((t) => !t.isCompleted && t.scheduledDate >= today)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  }, [data.scheduledTransactions])

  return (
    <FinanceContext.Provider
      value={{
        data,
        isLoaded,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        deleteCategory,
        addGoal,
        updateGoal,
        deleteGoal,
        addFixedBill,
        updateFixedBill,
        deleteFixedBill,
        addScheduledTransaction,
        updateScheduledTransaction,
        deleteScheduledTransaction,
        getCategory,
        getTotalIncome,
        getTotalExpenses,
        getBalance,
        getUpcomingBills,
        getUpcomingScheduled,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = React.useContext(FinanceContext)
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }
  return context
}
