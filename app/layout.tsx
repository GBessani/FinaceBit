import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

const APP_URL = "https://finace-bit.vercel.app"
const APP_NAME = "FinaceBit"
const APP_DESCRIPTION = "Gerencie suas finanças pessoais com inteligência. Controle receitas, despesas, investimentos, metas e conte com um assistente de IA para tomar melhores decisões financeiras."

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Gestão Financeira Pessoal`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "gestão financeira", "finanças pessoais", "controle de gastos",
    "orçamento pessoal", "investimentos", "metas financeiras",
    "assistente financeiro IA", "receitas e despesas", "planejamento financeiro",
  ],
  authors: [{ name: "Gabriel Bessani Ferreira" }],
  creator: "Gabriel Bessani Ferreira",
  publisher: "FinaceBit",
  applicationName: APP_NAME,
  category: "finance",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Gestão Financeira Pessoal`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FinaceBit — Gestão Financeira Pessoal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Gestão Financeira Pessoal`,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-CYNBJWSP9J`}
        strategy="afterInteractive"
      />
      <body className="font-sans antialiased bg-background">
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CYNBJWSP9J');
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}