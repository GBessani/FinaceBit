"use client"

import { useState } from "react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { useFinance } from "@/contexts/finance-context"
import { Goal } from "@/lib/types"
import { generateId, formatCurrency } from "@/lib/utils"
import { Plus, Target, Trash2, X, Edit3, Check } from "lucide-react"

export function GoalsList() {
  const { data, addGoal, updateGoal, deleteGoal, isLoaded } = useFinance()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Suas Metas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Meta</span>
        </button>
      </div>

      {data.goals.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma meta cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie metas para acompanhar seu progresso financeiro
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.goals.map((goal) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
            const isComplete = progress >= 100
            const daysLeft = Math.ceil(
              (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )

            return (
              <div
                key={goal.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5" style={{ color: goal.color }} />
                      ) : (
                        <Target className="h-5 w-5" style={{ color: goal.color }} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {isComplete
                          ? "Meta alcançada!"
                          : daysLeft > 0
                          ? `${daysLeft} dias restantes`
                          : "Prazo expirado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(goal.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{progress.toFixed(0)}%</span>
                  </div>

                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <GoalForm
          onClose={() => setShowForm(false)}
          onSubmit={(goal) => {
            addGoal(goal)
            setShowForm(false)
          }}
        />
      )}

      {editingGoal && (
        <GoalForm
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={(goal) => {
            updateGoal(goal)
            setEditingGoal(null)
          }}
        />
      )}
      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir meta?"
        description="A meta será removida permanentemente."
        onConfirm={() => { deleteId && deleteGoal(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

interface GoalFormProps {
  goal?: Goal
  onClose: () => void
  onSubmit: (goal: Goal) => void
}

const GOAL_COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
]

function GoalForm({ goal, onClose, onSubmit }: GoalFormProps) {
  const [name, setName] = useState(goal?.name || "")
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() || "")
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount.toString() || "0")
  const [deadline, setDeadline] = useState(
    goal?.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [color, setColor] = useState(goal?.color || GOAL_COLORS[0])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Nome é obrigatório"
    if (!targetAmount) errs.targetAmount = "Valor alvo é obrigatório"
    else if (parseFloat(targetAmount) <= 0) errs.targetAmount = "Valor deve ser maior que zero"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      id: goal?.id || generateId(),
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      deadline,
      color,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">
            {goal ? "Editar Meta" : "Nova Meta"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome da Meta</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem de férias"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Valor Objetivo</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Valor Atual</label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Prazo</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Cor</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {goal ? "Salvar Alterações" : "Criar Meta"}
          </button>
        </form>
      </div>
    </div>
  )
}