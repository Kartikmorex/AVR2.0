import type React from "react"
import { CheckCircle, XCircle } from "lucide-react"

interface InterlockStatusProps {
  interlocks: {
    tapChangerInProgress: boolean | 'N/A'
    tapChangerStuck: boolean | 'N/A'
    overCurrent: boolean | 'N/A'
    voltageError: boolean | 'N/A'
  }
}

const InterlockStatus: React.FC<InterlockStatusProps> = ({ interlocks }) => {
  // Helper to determine status and color
  const getStatus = (value: boolean | 'N/A') => {
    if (value === false) {
      return { label: 'OK', icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: 'text-green-600' }
    } else {
      return { label: 'Faulty', icon: <XCircle className="h-4 w-4 text-red-500" />, color: 'text-red-600' }
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm">Tap Changer In Progress</span>
        <div className="flex items-center gap-2">
          {getStatus(interlocks.tapChangerInProgress).icon}
          <span className={`text-sm ${getStatus(interlocks.tapChangerInProgress).color}`}>
            {getStatus(interlocks.tapChangerInProgress).label}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Tap Changer Stuck</span>
        <div className="flex items-center gap-2">
          {getStatus(interlocks.tapChangerStuck).icon}
          <span className={`text-sm ${getStatus(interlocks.tapChangerStuck).color}`}>
            {getStatus(interlocks.tapChangerStuck).label}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Over Current</span>
        <div className="flex items-center gap-2">
          {getStatus(interlocks.overCurrent).icon}
          <span className={`text-sm ${getStatus(interlocks.overCurrent).color}`}>
            {getStatus(interlocks.overCurrent).label}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Voltage Error</span>
        <div className="flex items-center gap-2">
          {getStatus(interlocks.voltageError).icon}
          <span className={`text-sm ${getStatus(interlocks.voltageError).color}`}>
            {getStatus(interlocks.voltageError).label}
          </span>
        </div>
      </div>
    </div>
  )
}

// keep a default for convenience **and** provide a named export
export default InterlockStatus
export { InterlockStatus }
