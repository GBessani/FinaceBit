import { FinancialData, DEFAULT_CATEGORIES, Transaction, Category, Goal, FixedBill, ScheduledTransaction } from "./types"

const STORAGE_KEY = "financa-app-data"

const emptyData: FinancialData = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  goals: [],
  fixedBills: [],
  scheduledTransactions: [],
  investments: [],
  creditCards: [],
}

export function getInitialData(): FinancialData {
  if (typeof window === "undefined") return emptyData

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const data = JSON.parse(stored)
      return {
        transactions: data.transactions || [],
        categories: data.categories || DEFAULT_CATEGORIES,
        goals: data.goals || [],
        fixedBills: data.fixedBills || [],
        scheduledTransactions: data.scheduledTransactions || [],
        investments: data.investments || [],
        creditCards: data.creditCards || [],
      }
    } catch {
      return emptyData
    }
  }
  return emptyData
}

export function saveData(data: FinancialData): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

export function addTransaction(data: FinancialData, transaction: Transaction): FinancialData {
  const newData = { ...data, transactions: [transaction, ...data.transactions] }
  saveData(newData); return newData
}
export function updateTransaction(data: FinancialData, transaction: Transaction): FinancialData {
  const newData = { ...data, transactions: data.transactions.map(t => t.id === transaction.id ? transaction : t) }
  saveData(newData); return newData
}
export function deleteTransaction(data: FinancialData, id: string): FinancialData {
  const newData = { ...data, transactions: data.transactions.filter(t => t.id !== id) }
  saveData(newData); return newData
}
export function addCategory(data: FinancialData, category: Category): FinancialData {
  const newData = { ...data, categories: [...data.categories, category] }
  saveData(newData); return newData
}
export function deleteCategory(data: FinancialData, id: string): FinancialData {
  const newData = { ...data, categories: data.categories.filter(c => c.id !== id) }
  saveData(newData); return newData
}
export function addGoal(data: FinancialData, goal: Goal): FinancialData {
  const newData = { ...data, goals: [...data.goals, goal] }
  saveData(newData); return newData
}
export function updateGoal(data: FinancialData, goal: Goal): FinancialData {
  const newData = { ...data, goals: data.goals.map(g => g.id === goal.id ? goal : g) }
  saveData(newData); return newData
}
export function deleteGoal(data: FinancialData, id: string): FinancialData {
  const newData = { ...data, goals: data.goals.filter(g => g.id !== id) }
  saveData(newData); return newData
}
export function addFixedBill(data: FinancialData, bill: FixedBill): FinancialData {
  const newData = { ...data, fixedBills: [...data.fixedBills, bill] }
  saveData(newData); return newData
}
export function updateFixedBill(data: FinancialData, bill: FixedBill): FinancialData {
  const newData = { ...data, fixedBills: data.fixedBills.map(b => b.id === bill.id ? bill : b) }
  saveData(newData); return newData
}
export function deleteFixedBill(data: FinancialData, id: string): FinancialData {
  const newData = { ...data, fixedBills: data.fixedBills.filter(b => b.id !== id) }
  saveData(newData); return newData
}
export function addScheduledTransaction(data: FinancialData, transaction: ScheduledTransaction): FinancialData {
  const newData = { ...data, scheduledTransactions: [...data.scheduledTransactions, transaction] }
  saveData(newData); return newData
}
export function updateScheduledTransaction(data: FinancialData, transaction: ScheduledTransaction): FinancialData {
  const newData = { ...data, scheduledTransactions: data.scheduledTransactions.map(t => t.id === transaction.id ? transaction : t) }
  saveData(newData); return newData
}
export function deleteScheduledTransaction(data: FinancialData, id: string): FinancialData {
  const newData = { ...data, scheduledTransactions: data.scheduledTransactions.filter(t => t.id !== id) }
  saveData(newData); return newData
}
