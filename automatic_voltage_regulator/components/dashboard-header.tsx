import { CircuitBoard } from "lucide-react"

export function DashboardHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        <CircuitBoard className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Automatic Voltage Regulation System</h1>
      </div>
      <p className="mt-2 text-gray-600">Monitor and control transformer voltage regulation across your network</p>
    </div>
  )
}
