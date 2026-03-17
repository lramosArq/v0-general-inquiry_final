import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Arquimea Grants Search | EU & USA Funding Opportunities",
  description:
    "Search and discover grant opportunities from EU and USA government agencies - Powered by Grants.gov and EU Funding & Tenders Portal",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} antialiased`}>
        <Suspense
          fallback={
            <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading Arquimea Grants...</p>
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </body>
    </html>
  )
}
