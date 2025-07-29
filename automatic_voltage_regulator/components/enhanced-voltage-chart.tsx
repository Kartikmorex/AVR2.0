"use client"

import { useEffect, useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExportManager } from "@/utils/export-helpers"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface TapChangeEvent {
  time: string
  direction: "raise" | "lower"
  tapPosition: number
  annotation?: string
}

interface EnhancedVoltageChartProps {
  voltageBand: {
    lower: number
    upper: number
  }
  currentVoltage: number
  deviceId: string
}

export function EnhancedVoltageChart({ voltageBand, currentVoltage, deviceId }: EnhancedVoltageChartProps) {
  const [voltageData, setVoltageData] = useState<number[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [tapChangeEvents, setTapChangeEvents] = useState<TapChangeEvent[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState("1h")
  const [customStartTime, setCustomStartTime] = useState("")
  const [customEndTime, setCustomEndTime] = useState("")
  const [showAnnotationDialog, setShowAnnotationDialog] = useState<number | null>(null)
  const [annotationText, setAnnotationText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv')

  useEffect(() => {
    fetchVoltageTrend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeRange, customStartTime, customEndTime, deviceId])

  const fetchVoltageTrend = async () => {
    setLoading(true)
    setError(null)
    try {
    const now = new Date()
    let startTime: Date
      let endTime: Date
    let dataPoints: number

    if (selectedTimeRange === "custom" && customStartTime && customEndTime) {
      startTime = new Date(customStartTime)
        endTime = new Date(customEndTime)
      const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        dataPoints = Math.min(Math.max(Math.floor(diffHours * 12), 10), 200)
    } else {
      const ranges = {
        "1h": { hours: 1, points: 60 },
        "6h": { hours: 6, points: 72 },
        "24h": { hours: 24, points: 96 },
        "7d": { hours: 168, points: 168 },
      }
      const range = ranges[selectedTimeRange as keyof typeof ranges] || ranges["1h"]
      startTime = new Date(now.getTime() - range.hours * 60 * 60 * 1000)
        endTime = now
      dataPoints = range.points
    }

      const url = `/avr/api/transformers/trend?deviceId=${encodeURIComponent(deviceId)}&sensorId=D150&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok || !Array.isArray(json.data) || json.data.length === 0) {
        setVoltageData([])
        setLabels([])
        setError(json.error || "No voltage data available")
        setLoading(false)
        return
      }

      // Map to chart data with IST time formatting
      const toISTString = (isoString: string) => {
        const date = new Date(isoString)
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 // in minutes
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
        const istTime = new Date(utc + (istOffset * 60000))
        // Format as 'DD-MM-YYYY HH:mm:ss'
        const pad = (n: number) => n.toString().padStart(2, '0')
        return `${pad(istTime.getDate())}-${pad(istTime.getMonth() + 1)}-${istTime.getFullYear()} ${pad(istTime.getHours())}:${pad(istTime.getMinutes())}:${pad(istTime.getSeconds())}`
      }
      const newLabels = json.data.map((d: any) => d.timestamp ? toISTString(d.timestamp) : "");
      const newData = json.data.map((d: any) => typeof d.D150 === "number" ? d.D150 : null);
    setLabels(newLabels)
    setVoltageData(newData)
      setError(null)
    } catch (e: any) {
      setError(e.message || "Failed to fetch voltage data")
    } finally {
      setLoading(false)
    }
  }

  const addAnnotation = (eventIndex: number) => {
    if (annotationText.trim()) {
      setTapChangeEvents((prev) =>
        prev.map((event, index) => (index === eventIndex ? { ...event, annotation: annotationText.trim() } : event)),
      )
      setAnnotationText("")
      setShowAnnotationDialog(null)
    }
  }

  // Revert: Use original voltageData for chart, do not multiply by 100
  const data = {
    labels,
    datasets: [
      {
        label: "Voltage",
        data: voltageData,
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        tension: 0.3,
      },
      {
        label: "Upper Band",
        data: Array(labels.length).fill(voltageBand.upper),
        borderColor: "rgba(255, 99, 132, 0.7)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "Lower Band",
        data: Array(labels.length).fill(voltageBand.lower),
        borderColor: "rgba(255, 99, 132, 0.7)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          afterBody: (context: any) => {
            const dataIndex = context[0].dataIndex
            const timeLabel = labels[dataIndex]
            const tapEvent = tapChangeEvents.find((event) => event.time === timeLabel)
            if (tapEvent) {
              return [
                `Tap ${tapEvent.direction}: Position ${tapEvent.tapPosition}`,
                tapEvent.annotation ? `Note: ${tapEvent.annotation}` : "",
              ].filter(Boolean)
            }
            return []
          },
        },
      },
    },
    scales: {
      y: {
        min: Math.min(voltageBand.lower - 15, Math.min(...voltageData) - 5),
        max: Math.max(voltageBand.upper + 15, Math.max(...voltageData) + 5),
      },
    },
  }

  const handleExport = () => {
    // Prepare export data: [{ timestamp, voltage, upperBand, lowerBand }]
    const exportData = labels.map((label, i) => ({
      timestamp: label,
      voltage: voltageData[i],
      upperBand: voltageBand.upper,
      lowerBand: voltageBand.lower,
    }))
    if (exportFormat === 'csv') {
      const csvRows = [
        ['Timestamp', 'Voltage', 'Upper Band', 'Lower Band'],
        ...exportData.map(row => [row.timestamp, row.voltage, row.upperBand, row.lowerBand]),
      ]
      ExportManager.downloadCSV(csvRows, `${deviceId}_voltage_trend_${new Date().toISOString().split('T')[0]}.csv`)
    } else {
      const excelRows = [
        ['Timestamp', 'Voltage', 'Upper Band', 'Lower Band'],
        ...exportData.map(row => [row.timestamp, row.voltage, row.upperBand, row.lowerBand]),
      ]
      ExportManager.downloadExcel(excelRows, `${deviceId}_voltage_trend_${new Date().toISOString().split('T')[0]}.xlsx`, 'Voltage Trend')
    }
    setExportDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="outline" onClick={() => setExportDialogOpen(true)}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Export Voltage Trend</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block mb-2 font-medium">Format</label>
              <div className="flex gap-2">
                <Button variant={exportFormat === 'csv' ? 'default' : 'outline'} size="sm" onClick={() => setExportFormat('csv')}>CSV</Button>
                <Button variant={exportFormat === 'excel' ? 'default' : 'outline'} size="sm" onClick={() => setExportFormat('excel')}>Excel</Button>
              </div>
            </div>
            <Button onClick={handleExport} className="mt-2">
              <Download className="h-4 w-4 mr-1" /> Export {exportFormat.toUpperCase()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Time Range Controls */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {["1h", "6h", "24h", "7d"].map((range) => (
            <Button
              key={range}
              variant={selectedTimeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeRange(range)}
              className="min-w-[60px] flex-1 sm:flex-none"
            >
              {range}
            </Button>
          ))}
          <Button
            variant={selectedTimeRange === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeRange("custom")}
            className="min-w-[80px] flex-1 sm:flex-none"
          >
            Custom
          </Button>
        </div>

        {selectedTimeRange === "custom" && (
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto">
            <div className="flex items-center gap-2">
              <Label htmlFor="start-time" className="text-sm whitespace-nowrap">
                From:
              </Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="flex-1 sm:w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="end-time" className="text-sm whitespace-nowrap">
                To:
              </Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                className="flex-1 sm:w-48"
              />
            </div>
          </div>
        )}
      </div>

      {/* Chart Container with proper containment */}
      <div className="relative">
        <div className="h-64 w-full relative overflow-hidden min-h-[200px] sm:h-64 border rounded-lg bg-white flex items-center justify-center">
          {loading ? (
            <span className="text-gray-400">Loading voltage trend...</span>
          ) : error ? (
            <span className="text-red-500">{error}</span>
          ) : (
          <Line data={data} options={options} />
          )}
        </div>
      </div>

      {/* Annotation Dialog */}
      {showAnnotationDialog !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Add Annotation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tap {tapChangeEvents[showAnnotationDialog]?.direction} at {tapChangeEvents[showAnnotationDialog]?.time}
            </p>
            <Input
              placeholder="Enter annotation..."
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAnnotationDialog(null)
                  setAnnotationText("")
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => addAnnotation(showAnnotationDialog)}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
