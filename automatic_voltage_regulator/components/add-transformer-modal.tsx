"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus, Trash2 } from "lucide-react"

interface Device {
  id: string
  name: string
  location: string
  type: string
  status: "online" | "offline"
  ratedVoltage: number
  ratedCurrent: number
  devID?: string
  devTypeID?: string
  devName?: string
  devTypeName?: string
}

interface AddTransformerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddTransformers: (devices: Device[]) => void
  alreadyAddedDeviceIds: string[]
}

export function AddTransformerModal({ isOpen, onClose, onAddTransformers, alreadyAddedDeviceIds }: AddTransformerModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([])
  const [deviceList, setDeviceList] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string>("")

  // Fetch device list from API when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
      console.log('API /api/devices/available called');
      fetch("/avr/api/devices/available")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch device list")
          return res.json()
        })
        .then((data) => {
          setDeviceList(Array.isArray(data) ? data : [])
        })
        .catch((err) => {
          setDeviceList([])
          setError("Could not load device list. Please try again.")
        })
        .finally(() => setLoading(false))
    } else {
      setDeviceList([])
      setError(null)
    }
  }, [isOpen])

  // Filter devices based on search term and already added device IDs
  const filteredDevices = useMemo(() => {
    return deviceList.filter(
      (device) =>
        (device.devName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         device.devTypeID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         device.devID?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !alreadyAddedDeviceIds.includes(device.devID ?? device.id)
    )
  }, [searchTerm, deviceList, alreadyAddedDeviceIds])

  // Helper to check if a device is already selected
  const isDeviceSelected = (device: Device) =>
    selectedDevices.some(
      d => (d.devID ?? d.id) === (device.devID ?? device.id)
    );

  // Handler for selecting a device
  const handleSelectDevice = (device: Device) => {
    if (!isDeviceSelected(device)) {
      setSelectedDevices(prev => [...prev, device]);
    }
  };

  // Remove device from selected list
  const removeDevice = (deviceId: string) => {
    setSelectedDevices((prev) => prev.filter((d) => (d.id || d.devID) !== deviceId))
  }

  // Handle adding transformers
  const handleAddTransformers = async () => {
    if (selectedDevices.length === 0) return;
    
    setLoading(true);
    try {
      // Prepare devices array with deviceId and deviceName
      const devicesToAdd = selectedDevices.map(device => ({
        deviceId: device.devID || device.id,
        deviceName: device.devName || device.name || device.devID || device.id,
        ratedVoltage: device.ratedVoltage,
        ratedCurrent: device.ratedCurrent,
        type: 'Individual',
        mode: 'Manual',
      }));
      
      console.log('Adding devices:', devicesToAdd);
      
      const response = await fetch('/avr/api/transformers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: devicesToAdd }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add devices');
      }
      
      const result = await response.json();
      console.log('Add devices result:', result);
      
      // Show different message based on whether fallback mode was used
      if (result.fallback) {
        console.warn('Database unavailable, devices added in fallback mode');
      }
      
      onAddTransformers(selectedDevices);
      setSelectedDevices([]);
      setSearchTerm("");
      setError(null);
      onClose();
    } catch (err: any) {
      console.error('Error adding devices:', err);
      setError(err.message || 'Failed to add devices. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Handle modal close
  const handleClose = () => {
    setSelectedDevices([])
    setSearchTerm("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Transformers from Account
          </DialogTitle>
        </DialogHeader>

        {/* Add Devices Button at the top */}
        <div className="flex justify-end mb-2">
          <Button
            onClick={handleAddTransformers}
            disabled={selectedDevices.length === 0 || loading}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Adding...' : 'Add Devices'}
          </Button>
        </div>

        {/* Search Devices Bar - now above both tables */}
        <div className="space-y-2 mb-2">
              <Label htmlFor="device-search">Search Devices</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="device-search"
                  placeholder="Search by name, location, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
          {/* Left Side - Device List */}
          <div className="flex-1 flex flex-col space-y-4">
            {/* Available Devices Section */}
            <div className="border rounded-lg overflow-hidden bg-white min-h-[350px] max-h-[70vh]" style={{ marginBottom: 24 }}>
              <div className="bg-gray-50 border-b p-3">
                <h4 className="text-sm font-medium text-gray-900">Available Devices</h4>
              </div>
              {deviceList && deviceList.length > 0 && filteredDevices.length > 0 ? (
                <div className="overflow-x-auto h-full">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">Device Name</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">Device ID</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">Device Type</th>
                        <th className="text-center p-3 text-sm font-medium text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices
                        .filter(device => !isDeviceSelected(device))
                        .map((device, index) => (
                          <tr key={device.devID} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="p-3 text-sm text-gray-900 font-medium">{device.devName ?? `Device ${index+1}`}</td>
                            <td className="p-3 text-sm text-gray-600">{device.devID}</td>
                            <td className="p-3 text-sm text-gray-600">{device.devTypeID}</td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectDevice(device)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                Add
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                    </div>
                  ) : (
                <div className="flex-1 flex items-center justify-center py-12 h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-sm">No devices available</p>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Selected Devices Table */}
          <div className="flex-1 flex flex-col space-y-4">
            {/* Selected Devices Section */}
            <div className="border rounded-lg overflow-hidden bg-white min-h-[350px] max-h-[70vh]">
              <div className="bg-gray-50 border-b p-3">
                <h4 className="text-sm font-medium text-gray-900">Selected for Addition</h4>
              </div>

              {selectedDevices.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12 h-full">
                  <div className="text-center text-gray-500">
                    <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No devices selected</p>
                    <p className="text-xs mt-1">Select devices from the left to add them here</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 h-full">
                  <div className="overflow-x-auto h-full">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-900">Device Name</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-900">Device ID</th>
                          <th className="text-center p-3 text-sm font-medium text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDevices.map((device, index) => (
                          <tr key={device.id || device.devID} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="p-3 text-sm text-gray-900 font-medium">{device.name ?? device.devName ?? device.devID ?? device.id ?? `Device ${index+1}`}</td>
                            <td className="p-3 text-sm text-gray-600">{device.devID ?? device.id ?? '-'}</td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDevice(device.id ?? device.devID ?? '')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {selectedDevices.length > 0 && (
              <span>
                {selectedDevices.length} device{selectedDevices.length !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTransformers}
              disabled={selectedDevices.length === 0 || loading}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {loading ? 'Adding...' : `Add ${selectedDevices.length} Transformer${selectedDevices.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
