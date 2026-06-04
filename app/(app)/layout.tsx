import { ConsultantProvider } from "@/contexts/consultant-context"
import { ConsultantBanner } from "@/components/layout/consultant-banner"
import { FinanceProvider } from "@/contexts/finance-context"
import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { AIAssistant } from "@/components/ai/ai-assistant"
import { Toaster } from "sonner"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ConsultantProvider user={user}>
      <FinanceProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <ConsultantBanner />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 pb-24 lg:pb-8">
              <div className="max-w-6xl mx-auto">{children}</div>
            </main>
          </div>
          <BottomNav />
          <AIAssistant />
          <Toaster richColors position="top-right" />
        </div>
      </FinanceProvider>
    </ConsultantProvider>
  )
}