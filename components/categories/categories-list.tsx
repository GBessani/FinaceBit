"use client"

import { useState } from "react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { useFinance } from "@/contexts/finance-context"
import { Category } from "@/lib/types"
import { generateId } from "@/lib/utils"
import { CategoryIcon, availableIcons } from "@/components/category-icon"
import { Plus, Trash2, X } from "lucide-react"

export function CategoriesList() {
  const { data, addCategory, deleteCategory, isLoaded } = useFinance()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense")

  const categories = data.categories.filter((c) => c.type === activeTab)

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-2 p-1 bg-secondary rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("expense")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "expense"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "income"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Receitas
          </button>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm group relative"
          >
            <button
              onClick={() => setDeleteId(category.id)}
              className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <div
              className="p-3 rounded-xl w-fit mb-3"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <CategoryIcon icon={category.icon} color={category.color} size={20} />
            </div>

            <p className="font-medium text-sm">{category.name}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <CategoryForm
          type={activeTab}
          onClose={() => setShowForm(false)}
          onSubmit={(category) => {
            addCategory(category)
            setShowForm(false)
          }}
        />
      )}
      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir categoria?"
        description="A categoria será removida. Transações vinculadas ficam sem categoria."
        onConfirm={() => { deleteId && deleteCategory(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

interface CategoryFormProps {
  type: "income" | "expense"
  onClose: () => void
  onSubmit: (category: Category) => void
}

const CATEGORY_COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#ef4444",
  "#06b6d4",
]

function CategoryForm({ type, onClose, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState(availableIcons[0])
  const [color, setColor] = useState(CATEGORY_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    onSubmit({
      id: generateId(),
      name,
      icon,
      color,
      type,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-lg">
            Nova Categoria de {type === "income" ? "Receita" : "Despesa"}
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
            <label className="block text-sm font-medium mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Assinaturas"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Ícone</label>
            <div className="grid grid-cols-8 gap-2">
              {availableIcons.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg border transition-colors ${
                    icon === iconName
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <CategoryIcon icon={iconName} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_COLORS.map((c) => (
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

          <div className="pt-2">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${color}20` }}
              >
                <CategoryIcon icon={icon} color={color} size={20} />
              </div>
              <span className="font-medium">{name || "Nome da categoria"}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Criar Categoria
          </button>
        </form>
      </div>
    </div>
  )
}