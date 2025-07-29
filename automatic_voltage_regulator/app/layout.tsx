import type { Metadata } from 'next'
import './globals.css'
import LiveProviders from './LiveProviders'
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Automatic Voltage Regulator',
  description: 'Automatic Voltage Regulator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LiveProviders>
          {children}
        </LiveProviders>
        <Toaster />
      </body>
    </html>
  )
}
