import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import GTM, { GTMNoScript } from "@/components/GTM"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Usada só na seção de estatística de impacto, replicada do app Viagente
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover é obrigatório para env(safe-area-inset-*) funcionar no Safari iOS
  viewportFit: "cover",
  themeColor: "#111111",
}

export const metadata: Metadata = {
  title: "Calculadora de Pontos Parados | Viagente",
  description:
    "Descubra quanto os seus pontos de milhas valem hoje e aonde eles já te levam. Análise gratuita, na hora.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <GTM />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <GTMNoScript />
        {children}
      </body>
    </html>
  )
}
