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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface VoltageChartProps {
  voltageBand: {
    lower: number
    upper: number
  }
  currentVoltage: number
}

export function VoltageChart({ voltageBand, currentVoltage }: VoltageChartProps) {
  const [voltageData, setVoltageData] = useState<number[]>([])
  const [labels, setLabels] = useState<string[]>([])

  useEffect(() => {
    // Generate mock data for the chart
    const generateData = () => {
      const now = new Date()
      const newLabels = []
      const newData = []

      for (let i = 30; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000)
        newLabels.push(time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))

        // Generate a voltage value that occasionally goes outside the band
        const baseVoltage = currentVoltage
        const variation = Math.random() * 15 - 7.5
        newData.push(baseVoltage + variation)
      }

      setLabels(newLabels)
      setVoltageData(newData)
    }

    generateData()

    // Update data every 5 seconds
    const interval = setInterval(() => {
      setLabels((prev) => {
        const now = new Date()
        const newLabels = [...prev.slice(1), now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })]
        return newLabels
      })

      setVoltageData((prev) => {
        const baseVoltage = currentVoltage
        const variation = Math.random() * 15 - 7.5
        return [...prev.slice(1), baseVoltage + variation]
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [currentVoltage])

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
      },
    },
    scales: {
      y: {
        min: Math.min(voltageBand.lower - 15, Math.min(...voltageData) - 5),
        max: Math.max(voltageBand.upper + 15, Math.max(...voltageData) + 5),
      },
    },
  }

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  )
}
