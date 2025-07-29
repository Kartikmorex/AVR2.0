import { Transformers } from "@/components/transformers"
import { DashboardHeader } from "@/components/dashboard-header"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader />
        <Transformers />
      </div>
    </main>
  )
}
