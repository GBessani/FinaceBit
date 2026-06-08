import { GoalsList } from "@/components/goals/goals-list"

export default function MetasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metas Financeiras</h1>
        <p className="text-muted-foreground">
          Defina e acompanhe suas metas de economia
        </p>
      </div>

      <GoalsList />
    </div>
  )
}