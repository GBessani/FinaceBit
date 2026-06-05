import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinaceBit - Gestão Financeira Pessoal",
    short_name: "FinaceBit",
    description: "Gerencie suas finanças pessoais com inteligência artificial",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
