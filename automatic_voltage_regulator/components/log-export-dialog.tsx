"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileText, Table } from "lucide-react"

interface LogExportDialogProps {
  isOpen: boolean
  onClose: () => void
  logType: "tap-change" | "event"
  transformerName: string
  onExport: (options: ExportOptions) => void
}

interface ExportOptions {
  format: "csv" | "excel"
  dateRange: {
    start: string
    end: string
  }
  includeColumns: string[]
  filterBySeverity?: string[]
}

export function LogExportDialog({ isOpen, onClose, logType, transformerName, onExport }: LogExportDialogProps) {
  const [format, setFormat] = useState<"csv" | "excel">("csv")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])

  const tapChangeColumns = [
    "Timestamp",
    "Action",
    "From Position",
    "To Position",
    "Mode",
    "Voltage Before",
    "Voltage After",
    "Initiated By",
    "Status",
  ]

  const eventColumns = ["Timestamp", "Event Type", "Severity", "Description", "Additional Data", "Acknowledged"]

  const severityOptions = ["Critical", "Warning", "Info", "Normal"]

  const availableColumns = logType === "tap-change" ? tapChangeColumns : eventColumns

  const handleExport = () => {
    const options: ExportOptions = {
      format,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      includeColumns: selectedColumns.length > 0 ? selectedColumns : availableColumns,
      ...(logType === "event" && { filterBySeverity: selectedSeverities }),
    }
    onExport(options)
    onClose()
  }

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) => (prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]))
  }

  const toggleSeverity = (severity: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity],
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-full overflow-hidden flex flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {logType === "tap-change" ? "Tap Change" : "Event"} Log - {transformerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          {/* Format Selection */}
          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <div className="mt-2">
              <select
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={format}
                onChange={e => setFormat(e.target.value as 'csv' | 'excel')}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label className="text-base font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="start-date" className="text-sm">
                  From
                </Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm">
                  To
                </Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div>
            <Label className="text-base font-medium">Columns to Include</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
              {availableColumns.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={column}
                    checked={selectedColumns.length === 0 || selectedColumns.includes(column)}
                    onCheckedChange={() => toggleColumn(column)}
                  />
                  <Label htmlFor={column} className="text-sm">
                    {column}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedColumns.length === 0 ? "All columns selected" : `${selectedColumns.length} columns selected`}
            </p>
          </div>

          {/* Severity Filter (Event Log Only) */}
          {logType === "event" && (
            <div>
              <Label className="text-base font-medium">Filter by Severity</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {severityOptions.map((severity) => (
                  <div key={severity} className="flex items-center space-x-2">
                    <Checkbox
                      id={severity}
                      checked={selectedSeverities.length === 0 || selectedSeverities.includes(severity)}
                      onCheckedChange={() => toggleSeverity(severity)}
                    />
                    <Label htmlFor={severity} className="text-sm">
                      {severity}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedSeverities.length === 0
                  ? "All severities included"
                  : `${selectedSeverities.length} severities selected`}
              </p>
            </div>
          )}

          {/* Export Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export {format.toUpperCase()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
