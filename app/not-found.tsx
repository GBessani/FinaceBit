import { Wallet, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Número 404 estilizado */}
        <div className="relative mb-8">
          <p className="text-[120px] font-black text-border leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-primary rounded-2xl shadow-lg">
              <Wallet className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            <Home className="h-4 w-4" />
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
