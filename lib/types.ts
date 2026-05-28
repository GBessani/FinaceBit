export type TransactionType = "income" | "expense" | "transfer"

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: TransactionType
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  categoryId: string
  date: string
  notes?: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  color: string
}

export type RecurrenceType = "monthly" | "weekly" | "biweekly" | "yearly"

export interface FixedBill {
  id: string
  description: string
  amount: number
  type: TransactionType
  categoryId: string
  dueDay: number // dia do mês para vencimento
  recurrence: RecurrenceType
  isActive: boolean
  notes?: string
  // Parcelamento (opcional)
  totalInstallments?: number  // total de parcelas (null = sem fim)
  currentInstallment?: number // parcela atual
  startDate?: string          // data da primeira parcela (YYYY-MM-DD)
}

export interface ScheduledTransaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  categoryId: string
  scheduledDate: string
  isCompleted: boolean
  notes?: string
  fixedBillId?: string
  installmentNumber?: number
}

export interface FinancialData {
  investments: Investment[]
  creditCards: CreditCard[]
  investmentTransactions: InvestmentTransaction[]
  transactions: Transaction[]
  categories: Category[]
  goals: Goal[]
  fixedBills: FixedBill[]
  scheduledTransactions: ScheduledTransaction[]
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Salário", icon: "Briefcase", color: "#10b981", type: "income" },
  { id: "2", name: "Freelance", icon: "Laptop", color: "#06b6d4", type: "income" },
  { id: "3", name: "Investimentos", icon: "TrendingUp", color: "#8b5cf6", type: "income" },
  { id: "4", name: "Outros", icon: "Plus", color: "#6b7280", type: "income" },
  { id: "5", name: "Alimentação", icon: "Utensils", color: "#f97316", type: "expense" },
  { id: "6", name: "Transporte", icon: "Car", color: "#3b82f6", type: "expense" },
  { id: "7", name: "Moradia", icon: "Home", color: "#ec4899", type: "expense" },
  { id: "8", name: "Saúde", icon: "Heart", color: "#ef4444", type: "expense" },
  { id: "9", name: "Educação", icon: "GraduationCap", color: "#14b8a6", type: "expense" },
  { id: "10", name: "Lazer", icon: "Gamepad2", color: "#a855f7", type: "expense" },
  { id: "11", name: "Compras", icon: "ShoppingBag", color: "#f59e0b", type: "expense" },
  { id: "12", name: "Contas", icon: "FileText", color: "#64748b", type: "expense" },
]

export type AssetType = "crypto" | "stock" | "fund" | "fixed_income"
export type InvestmentType = AssetType
export type FixedIncomeIndex = "CDI" | "SELIC" | "IPCA" | "prefixado"

export interface Investment {
  id: string
  name: string
  ticker: string
  assetType: AssetType
  quantity: number
  avgPrice: number
  notes?: string
  // Campos novos
  investedAmount?: number
  investedAt?: string
  rate?: number
  rateIndex?: FixedIncomeIndex
  maturityDate?: string
}

export interface CreditCard {
  id: string
  name: string
  limitAmount: number
  dueDay: number      // dia do vencimento
  closingDay: number  // dia do fechamento (calculado: dueDay - 7)
  color: string
  isActive: boolean
}

export interface InvestmentTransaction {
  id: string
  investmentId: string
  type: "buy" | "sell"
  quantity: number
  price: number
  total: number
  date: string
  notes?: string
}
