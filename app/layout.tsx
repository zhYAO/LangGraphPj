import type { Metadata } from 'next'
import { AuthProvider } from '@/app/contexts/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'LangGraph Chat App',
  description: 'Chat application powered by LangGraph',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="overflow-hidden bg-[#050509] text-slate-200 antialiased selection:bg-blue-500/30">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
