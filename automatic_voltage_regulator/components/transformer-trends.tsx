"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedVoltageChart } from "@/components/enhanced-voltage-chart"
import { EnhancedCurrentChart } from "@/components/enhanced-current-chart"
import type { Transformer } from "@/types/transformer"

interface TransformerTrendsProps {
  transformer: Transformer
  liveTransformer: Transformer
}

export const TransformerTrends = React.memo(function TransformerTrends({ transformer, liveTransformer }: TransformerTrendsProps) {
  const voltageBand = React.useMemo(() => ({
    lower: Number(liveTransformer.lowerVoltage ?? liveTransformer.voltageBand?.lower ?? 0),
    upper: Number(liveTransformer.upperVoltage ?? liveTransformer.voltageBand?.upper ?? 0),
  }), [liveTransformer.lowerVoltage, liveTransformer.upperVoltage, liveTransformer.voltageBand]);

  const deviceId = React.useMemo(() => 
    liveTransformer.deviceId || liveTransformer.id
  , [liveTransformer.deviceId, liveTransformer.id]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-medium">Trends</h3>
      <Tabs defaultValue="voltage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="voltage">Voltage Trend</TabsTrigger>
          <TabsTrigger value="current">Current Trend</TabsTrigger>
        </TabsList>
        <TabsContent value="voltage" className="mt-4">
          <div className="min-h-[300px] max-h-[400px]">
            <EnhancedVoltageChart
              voltageBand={voltageBand}
              currentVoltage={liveTransformer.voltage}
              deviceId={deviceId}
            />
          </div>
        </TabsContent>
        <TabsContent value="current" className="mt-4">
          <div className="min-h-[300px] max-h-[400px]">
            <EnhancedCurrentChart
              currentRating={transformer.currentRating}
              currentValue={transformer.currentRating.currentValue}
              deviceId={deviceId}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
})