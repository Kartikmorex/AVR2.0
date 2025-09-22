"use client"

import { useState } from "react"
import { CircuitBoard, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserSettings } from "@/components/user-settings"

export function DashboardHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircuitBoard className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Automatic Voltage Regulation System</h1>
        </div>
        
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <UserSettings />
          </DialogContent>
        </Dialog>
      </div>
      <p className="mt-2 text-gray-600">Monitor and control transformer voltage regulation across your network</p>
    </div>
  )
}
