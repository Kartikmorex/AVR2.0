"use client"

import React from "react"
import { ArrowDown, ArrowUp, Crown, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Transformer } from "@/types/transformer"

interface TransformerQuickControlsProps {
  transformer: Transformer
  mode: "auto" | "manual"
  liveTapPosition: number | null
  cooldownTimer: number
  tapCooldown: number
  tapCommandLoading: "raise" | "lower" | null
  isTapChanging: boolean
  savingSettings: boolean
  isModeChanging: boolean
  voltageErrorForTap: boolean
  overviewHasActiveInterlock: boolean
  handleModeChange: (mode: "auto" | "manual") => void
  handleTapChangeWithCooldown: (direction: "raise" | "lower") => void
}

export const TransformerQuickControls = React.memo(function TransformerQuickControls({
  transformer,
  mode,
  liveTapPosition,
  cooldownTimer,
  tapCooldown,
  tapCommandLoading,
  isTapChanging,
  savingSettings,
  isModeChanging,
  voltageErrorForTap,
  overviewHasActiveInterlock,
  handleModeChange,
  handleTapChangeWithCooldown,
}: TransformerQuickControlsProps) {
  const tapMin = transformer.tapLimits?.min ?? 1
  const tapMax = transformer.tapLimits?.max ?? 21

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-medium">Quick Controls</h3>

      {transformer.type === 'Follower' ? (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-800">Follower Mode</h4>
          </div>
          <p className="text-sm text-blue-700">
            This transformer is configured as a Follower and automatically follows the settings of its Master
            transformer. No manual or automatic commands can be issued directly to this transformer.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mode Control */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Operation Mode</h4>
            <div className="flex items-center space-x-4">
              <Button
                variant={mode === "auto" ? "default" : "outline"}
                size="sm"
                onClick={() => handleModeChange("auto")}
                disabled={savingSettings || isModeChanging}
              >
                {(savingSettings || (isModeChanging && mode !== "auto")) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Switching...
                  </>
                ) : (
                  "Auto Mode"
                )}
              </Button>
              <Button
                variant={mode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => handleModeChange("manual")}
                disabled={savingSettings || isModeChanging}
              >
                {(savingSettings || (isModeChanging && mode !== "manual")) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Switching...
                  </>
                ) : (
                  "Manual Mode"
                )}
              </Button>
            </div>
          </div>

          {/* Manual Control */}
          {mode === "manual" && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Tap Control</h4>
              {transformer.masterFollower?.isMaster && (
                <div className="mb-3 rounded-md bg-yellow-50 border border-yellow-200 p-3">
                  <p className="text-sm text-yellow-700">
                    <Crown className="inline h-4 w-4 mr-1" />
                    Commands will be replicated to all follower transformers
                  </p>
                </div>
              )}
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Current Tap Position: {typeof liveTapPosition === 'number' ? liveTapPosition.toFixed(2) : 'N/A'} (Range: {tapMin} - {tapMax})
                </p>
                {cooldownTimer > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
                    <Clock className="h-4 w-4" />
                    <span>Next command available in {cooldownTimer} seconds</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  size="sm"
                  onClick={() => handleTapChangeWithCooldown('raise')}
                  disabled={isTapChanging || tapCooldown > 0 || (typeof liveTapPosition === 'number' && liveTapPosition >= tapMax) || voltageErrorForTap || tapCommandLoading === 'raise'}
                >
                  {tapCommandLoading === 'raise' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <>
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Raise Tap {tapCooldown > 0 && <span className="ml-1 text-xs text-orange-600">({tapCooldown}s)</span>}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleTapChangeWithCooldown('lower')}
                  disabled={isTapChanging || tapCooldown > 0 || (typeof liveTapPosition === 'number' && liveTapPosition <= tapMin) || voltageErrorForTap || tapCommandLoading === 'lower'}
                >
                  {tapCommandLoading === 'lower' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <>
                      <ArrowDown className="mr-2 h-4 w-4" />
                      Lower Tap {tapCooldown > 0 && <span className="ml-1 text-xs text-orange-600">({tapCooldown}s)</span>}
                    </>
                  )}
                </Button>
              </div>
              {voltageErrorForTap && (
                <p className="mt-2 text-sm text-red-500">Cannot change tap: voltage is out of band</p>
              )}
              {overviewHasActiveInterlock && (
                <p className="mt-2 text-sm text-red-500">Cannot change tap: interlock active</p>
              )}
              {typeof liveTapPosition === 'number' && liveTapPosition >= tapMax && (
                <p className="mt-2 text-sm text-orange-500">Cannot raise tap: already at maximum position</p>
              )}
              {typeof liveTapPosition === 'number' && liveTapPosition <= tapMin && (
                <p className="mt-2 text-sm text-orange-500">Cannot lower tap: already at minimum position</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})