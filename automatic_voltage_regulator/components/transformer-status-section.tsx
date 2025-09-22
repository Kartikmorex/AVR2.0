"use client"

import React from "react"
import { CheckCircle, XCircle, AlertTriangle, Crown, Users } from "lucide-react"
import type { Transformer } from "@/types/transformer"

interface TransformerStatusSectionProps {
  transformer: Transformer
  liveTransformer: Transformer
  transformers: Transformer[]
  liveVoltage: number | null
  voltageLoading: boolean
  liveTapPosition: number | null
  tapPositionLoading: boolean
  tapPositionError: string | null
  overviewStatus: string
  overviewVoltageError: boolean
  overviewVoltageBand: { lower: number; upper: number }
}

function displayValue(value: any, unit: string = ""): string {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number" && isNaN(value)) return "N/A";
  return unit ? `${value} ${unit}` : `${value}`;
}

export const TransformerStatusSection = React.memo(function TransformerStatusSection({
  transformer,
  liveTransformer,
  transformers,
  liveVoltage,
  voltageLoading,
  liveTapPosition,
  tapPositionLoading,
  tapPositionError,
  overviewStatus,
  overviewVoltageError,
  overviewVoltageBand,
}: TransformerStatusSectionProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-medium">Status</h3>
      <div className="grid grid-cols-2 gap-y-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Status</p>
          <div className="flex items-center gap-2">
            {overviewStatus === "normal" && <CheckCircle className="h-5 w-5 text-green-500" />}
            {overviewStatus === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {overviewStatus === "error" && <XCircle className="h-5 w-5 text-red-500" />}
            <p className="font-medium">
              {overviewStatus.charAt(0).toUpperCase() + overviewStatus.slice(1)}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Type</p>
          <div className="flex items-center gap-2">
            {transformer.masterFollower?.isMaster && <Crown className="h-5 w-5 text-yellow-500" />}
            {transformer.masterFollower?.isFollower && <Users className="h-5 w-5 text-blue-500" />}
            <div>
              <p className="font-medium">{displayValue(transformer.type)}</p>
              {transformer.masterFollower?.isFollower && (
                <p className="text-xs text-gray-500">
                  Following:{" "}
                  {displayValue(transformers.find((t) => t.id === transformer.masterFollower?.masterId)?.deviceName || transformers.find((t) => t.id === transformer.masterFollower?.masterId)?.name)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Tap Position</p>
          {tapPositionLoading ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : tapPositionError ? (
            <span className="text-red-500 text-sm">{tapPositionError}</span>
          ) : (
            <span className="font-medium">{typeof liveTapPosition === 'number' ? liveTapPosition.toFixed(2) : 'N/A'}</span>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500">Voltage</p>
          {voltageLoading ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : overviewVoltageError ? (
            <span className="font-medium text-red-500 flex items-center gap-1">
              {typeof liveVoltage === 'number' ? `${liveVoltage.toFixed(2)} V` : 'N/A'}
              <span title={`Voltage (${typeof liveVoltage === 'number' ? (liveVoltage * 100).toFixed(0) : ''}) is out of band (${overviewVoltageBand.lower} - ${overviewVoltageBand.upper})`}>
                <AlertTriangle className="h-4 w-4 text-red-500 ml-1" />
              </span>
            </span>
          ) : (
            <span className="font-medium">{typeof liveVoltage === 'number' ? `${liveVoltage.toFixed(2)} V` : 'N/A'}</span>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500">Band</p>
          <p className="font-medium">
            {typeof liveTransformer.lowerVoltage !== 'undefined' && typeof liveTransformer.upperVoltage !== 'undefined'
              ? `${liveTransformer.lowerVoltage} - ${liveTransformer.upperVoltage} V`
              : (liveTransformer.voltageBand ? `${liveTransformer.voltageBand.lower} - ${liveTransformer.voltageBand.upper} V` : 'N/A')}
          </p>
        </div>
      </div>
    </div>
  )
})