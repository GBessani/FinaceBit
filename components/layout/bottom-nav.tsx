"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  BarChart3,
  MoreHorizontal,
  CalendarClock,
  RefreshCw,
  Tags,
  TrendingUp,
  LogOut,
  X,
  CreditCard,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useFinance } from "@/contexts/finance-context"
import { ThemeToggle } from "@/components/layout/theme-toggle"

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
]

const moreNav = [
  { href: "/lancamentos-futuros", label: "Lançamentos Futuros", icon: CalendarClock },
  { href: "/contas-fixas", label: "Contas Fixas", icon: RefreshCw },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/categorias", label: "Categorias", icon: Tags },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useFinance()
  const [showMore, setShowMore] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  if (!isMobile) return null

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  return (
    <>
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-pb ">
        <div className="flex items-center justify-around px-2 py-2">
          {mainNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* Mais */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              moreNav.some(i => i.href === pathname) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="relative bg-card border-t border-border rounded-t-2xl p-4 space-y-1 safe-area-pb">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {user?.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.user_metadata.avatar_url} alt="avatar" className="h-7 w-7 rounded-full" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-semibold">
                    {(user?.user_metadata?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium truncate max-w-[160px]">
                  {user?.user_metadata?.full_name ?? user?.email}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button onClick={() => setShowMore(false)} className="p-2 hover:bg-secondary rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {moreNav.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-secondary transition-colors mt-2"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}