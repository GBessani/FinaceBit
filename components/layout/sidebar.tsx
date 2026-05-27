"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Tags,
  BarChart3,
  Menu,
  X,
  Wallet,
  RefreshCw,
  CalendarClock,
  LogOut,
  TrendingUp,
  CreditCard,
} from "lucide-react"
import { useState } from "react"
import { useFinance } from "@/contexts/finance-context"
import { ThemeToggle } from "@/components/layout/theme-toggle"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/lancamentos-futuros", label: "Lançamentos Futuros", icon: CalendarClock },
  { href: "/contas-fixas", label: "Contas Fixas", icon: RefreshCw },
  { href: "/cartoes", label: "Cartões de Crédito", icon: CreditCard },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useFinance()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-card border border-border rounded-lg shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform lg:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FinaceBit</span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User info + Logout */}
          <div className="pt-4 border-t border-sidebar-border space-y-3">
            {user && (
              <Link href="/perfil" className="flex items-center gap-2 px-1 hover:opacity-80 transition-opacity">
                {user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-semibold">
                    {(user.user_metadata?.full_name ?? user.email ?? "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {user.user_metadata?.full_name ?? user.email}
                </span>
              </Link>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSignOut}
                className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}