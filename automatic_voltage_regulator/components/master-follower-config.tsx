"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Transformer } from "@/types/transformer"

interface MasterFollowerConfigProps {
  transformers: Transformer[]
  onClose: () => void
  onSave: (masterId: string, followerIds: string[]) => void
}

export function MasterFollowerConfig({ transformers, onClose, onSave }: MasterFollowerConfigProps) {
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null)
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([])

  const handleMasterSelect = (deviceId: string) => {
    if (selectedMaster === deviceId) {
      setSelectedMaster(null)
    } else {
      setSelectedMaster(deviceId)
      setSelectedFollowers([]) // Clear all followers on master change
    }
  }

  const handleFollowerSelect = (deviceId: string) => {
    if (selectedMaster === deviceId) return
    setSelectedFollowers((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    )
  }

  const handleSave = () => {
    if (!selectedMaster) return onClose()

    // Ensure master is not in followers list
    const cleanFollowers = selectedFollowers.filter(id => id !== selectedMaster)
    onSave(selectedMaster, cleanFollowers)
  }

  const standaloneTransformers = transformers
    .filter(t => t.deviceId !== selectedMaster && !selectedFollowers.includes(t.deviceId || ""))
    .map(t => t.deviceName || t.name)

  const getNameById = (id: string) =>
    transformers.find(t => t.deviceId === id)?.deviceName || "Unknown"

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-full overflow-hidden flex flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configure Master-Follower Relationship</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-medium">Instructions</h3>
              <p className="text-sm text-gray-600">
                Select one transformer to act as the Master. Then select which transformers will follow the Master's
                settings. Any transformers not selected will operate as standalone units.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-medium">Master Transformer</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {transformers.map((transformer) => {
                  console.log('Rendering master card', transformer.deviceId, 'selectedMaster:', selectedMaster);
                  const isSelected = selectedMaster === transformer.deviceId
                  const isFollower = selectedFollowers.includes(transformer.deviceId || "")
                  const isDisabled = (selectedMaster !== null && !isSelected) || isFollower

                  return (
                    <div
                      key={transformer.deviceId}
                      className={`rounded-md border p-3 ${
                        isSelected ? "border-blue-500 bg-blue-50" : ""
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      onClick={() => !isDisabled && handleMasterSelect(transformer.deviceId || "")}
                      style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}
                    >
                      <p className="font-medium">{transformer.deviceName || transformer.name}</p>
                      <p className="text-sm text-gray-600">Current Mode: {transformer.mode}</p>
                      {isFollower && (
                        <p className="text-xs text-red-500 mt-1">Cannot select as master (already a follower)</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-medium">Follower Transformers</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {transformers.map((transformer) => {
                  const isMaster = selectedMaster === transformer.deviceId
                  const isSelected = selectedFollowers.includes(transformer.deviceId || "")
                  return (
                    <div
                      key={transformer.deviceId}
                      className={`rounded-md border p-3 ${
                        isSelected ? "border-green-500 bg-green-50" : ""
                      } ${isMaster ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      onClick={() => !isMaster && handleFollowerSelect(transformer.deviceId || "")}
                      style={{ pointerEvents: isMaster ? 'none' : 'auto' }}
                    >
                      <p className="font-medium">{transformer.deviceName || transformer.name}</p>
                      <p className="text-sm text-gray-600">Current Mode: {transformer.mode}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-medium">Configuration Summary</h3>
              <div className="rounded-md bg-gray-50 p-4 space-y-2">
                <div>
                  <p className="font-medium">Master:</p>
                  <p className="text-sm">{selectedMaster ? getNameById(selectedMaster) : "None"}</p>
                </div>
                <div>
                  <p className="font-medium">Followers:</p>
                  <p className="text-sm">
                    {selectedFollowers.length > 0
                      ? selectedFollowers.map(getNameById).join(", ")
                      : "No followers selected"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Standalone Transformers:</p>
                  <p className="text-sm">
                    {standaloneTransformers.length > 0
                      ? standaloneTransformers.join(", ")
                      : "No standalone transformers"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedMaster(null)
                  setSelectedFollowers([])
                }}
              >
                Reset
              </Button>
              <Button onClick={handleSave} disabled={!selectedMaster}>
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
