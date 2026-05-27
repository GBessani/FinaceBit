import { FinanceProvider } from "@/contexts/finance-context"
import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { AIAssistant } from "@/components/ai/ai-assistant"
import { Toaster } from "sonner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceProvider>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar — só desktop */}
        <Sidebar />

        {/* Conteúdo principal */}
        <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* Bottom Nav — só mobile */}
        <BottomNav />

        <AIAssistant />
        <Toaster richColors position="top-right" />
      </div>
    </FinanceProvider>
  )
}
