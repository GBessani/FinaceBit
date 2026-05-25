import { CategoriesList } from "@/components/categories/categories-list"

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorias</h1>
        <p className="text-muted-foreground">
          Organize suas transações por categorias
        </p>
      </div>

      <CategoriesList />
    </div>
  )
}
