import { ConsultantProvider } from "@/contexts/consultant-context"
import { ConsultantBanner } from "@/components/layout/consultant-banner"
import { FinanceProvider } from "@/contexts/finance-context"
import { Sidebar } from "@/components/layout/sidebar"
import { AIAssistant } from "@/components/ai/ai-assistant"
import { Toaster } from "sonner"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ConsultantProvider user={user}>
      <FinanceProvider>
        <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
          <ConsultantBanner />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 min-w-0 p-4 lg:p-8 pt-16 lg:pt-8 pb-8 overflow-x-hidden">
              <div className="max-w-6xl mx-auto">{children}</div>
            </main>
          </div>
          <AIAssistant />
          <Toaster richColors position="top-right" />
        </div>
      </FinanceProvider>
    </ConsultantProvider>
  )
}