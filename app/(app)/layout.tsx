import { FinanceProvider } from "@/contexts/finance-context"
import { Sidebar } from "@/components/layout/sidebar"
import { AIAssistant } from "@/components/ai/ai-assistant"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
        <AIAssistant />
      </div>
    </FinanceProvider>
  )
}
