"use client"

import { useState, useCallback, useEffect } from "react"
import type { Transformer, TransformerType, ToleranceBand } from "@/types/transformer"

// Helper function to determine transformer type
const getTransformerType = (transformer: Partial<Transformer>): TransformerType => {
  if (transformer.masterFollower?.isMaster) return "Master"
  if (transformer.masterFollower?.isFollower) return "Follower"
  return "Individual"
}

// Mock data for transformers - Updated with new fields
const initialTransformers: Transformer[] = [
  {
    id: "t1",
    name: "Main Distribution Transformer Unit 1",
    mode: "auto",
    status: "normal",
    voltage: 220,
    tapPosition: 5,
    tapLimits: {
      min: 1,
      max: 10,
    },
    voltageBand: {
      lower: 209,
      upper: 231,
    },
    toleranceBand: {
      referenceVoltage: 220, // kV
      tolerancePercentage: 2.5,
      lowerLimit: 214.5, // 220 - (220 * 0.025)
      upperLimit: 225.5, // 220 + (220 * 0.025)
    },
    currentRating: {
      ratedCurrent: 1000,
      overCurrentLimit: 800,
      currentValue: 650,
    },
    voltageSource: "relay",
    interlocks: {
      tapChangerInProgress: false,
      tapChangerStuck: false,
      overCurrent: false,
      voltageError: false,
    },
    masterFollower: null,
    type: "Individual",
    isLive: true,
    voltageSignalValid: true,
  },
  {
    id: "t2",
    name: "Secondary Power Transformer Station 2",
    mode: "manual",
    status: "normal",
    voltage: 220,
    tapPosition: 5,
    tapLimits: {
      min: 1,
      max: 10,
    },
    voltageBand: {
      lower: 209,
      upper: 231,
    },
    toleranceBand: {
      referenceVoltage: 220,
      tolerancePercentage: 2.5,
      lowerLimit: 214.5,
      upperLimit: 225.5,
    },
    currentRating: {
      ratedCurrent: 1000,
      overCurrentLimit: 800,
      currentValue: 720,
    },
    voltageSource: "mfm",
    interlocks: {
      tapChangerInProgress: false,
      tapChangerStuck: false,
      overCurrent: false,
      voltageError: false,
    },
    masterFollower: null,
    type: "Individual",
    isLive: true,
    voltageSignalValid: true,
  },
  {
    id: "t3",
    name: "Industrial Complex Transformer 3",
    mode: "auto",
    status: "normal",
    voltage: 218,
    tapPosition: 4,
    tapLimits: {
      min: 1,
      max: 12,
    },
    voltageBand: {
      lower: 209,
      upper: 231,
    },
    toleranceBand: {
      referenceVoltage: 220,
      tolerancePercentage: 2.5,
      lowerLimit: 214.5,
      upperLimit: 225.5,
    },
    currentRating: {
      ratedCurrent: 1000,
      overCurrentLimit: 800,
      currentValue: 650,
    },
    voltageSource: "relay",
    interlocks: {
      tapChangerInProgress: false,
      tapChangerStuck: false,
      overCurrent: false,
      voltageError: false,
    },
    masterFollower: null,
    type: "Individual",
    isLive: true,
    voltageSignalValid: true,
  },
  {
    id: "t4",
    name: "Emergency Backup Transformer Unit 4",
    mode: "auto",
    status: "error",
    voltage: 205,
    tapPosition: 1,
    tapLimits: {
      min: 1,
      max: 8,
    },
    voltageBand: {
      lower: 209,
      upper: 231,
    },
    toleranceBand: {
      referenceVoltage: 220,
      tolerancePercentage: 2.5,
      lowerLimit: 214.5,
      upperLimit: 225.5,
    },
    currentRating: {
      ratedCurrent: 1000,
      overCurrentLimit: 800,
      currentValue: 900,
    },
    voltageSource: "relay",
    interlocks: {
      tapChangerInProgress: true,
      tapChangerStuck: false,
      overCurrent: true,
      voltageError: false,
    },
    masterFollower: null,
    type: "Individual",
    isLive: true,
    voltageSignalValid: true,
  },
  {
    id: "t5",
    name: "Commercial District Transformer 5",
    mode: "manual",
    status: "normal",
    voltage: 225,
    tapPosition: 6,
    tapLimits: {
      min: 1,
      max: 10,
    },
    voltageBand: {
      lower: 209,
      upper: 231,
    },
    toleranceBand: {
      referenceVoltage: 220,
      tolerancePercentage: 2.5,
      lowerLimit: 214.5,
      upperLimit: 225.5,
    },
    currentRating: {
      ratedCurrent: 1000,
      overCurrentLimit: 800,
      currentValue: 750,
    },
    voltageSource: "mfm",
    interlocks: {
      tapChangerInProgress: false,
      tapChangerStuck: false,
      overCurrent: false,
      voltageError: false,
    },
    masterFollower: null,
    type: "Individual",
    isLive: true,
    voltageSignalValid: true,
  },
]

// Add helper functions for AVR logic
const calculateToleranceBand = (referenceVoltage: number, tolerancePercentage: number) => {
  const tolerance = referenceVoltage * (tolerancePercentage / 100)
  return {
    lowerLimit: referenceVoltage - tolerance,
    upperLimit: referenceVoltage + tolerance,
  }
}

const checkVoltageInToleranceBand = (voltage: number, toleranceBand: ToleranceBand) => {
  return voltage >= toleranceBand.lowerLimit && voltage <= toleranceBand.upperLimit
}

const checkOverCurrent = (currentValue: number, overCurrentLimit: number) => {
  return currentValue > overCurrentLimit
}

const canIssueCommand = (transformer: Transformer, direction: "raise" | "lower") => {
  console.log('canIssueCommand called with:', { transformer, direction });
  // Rule 1: Tap position limits
  const tapLimitMin = transformer.tapLimitMin ?? 1;
  const tapLimitMax = transformer.tapLimitMax ?? 21;
  if (direction === "lower" && transformer.tapPosition <= tapLimitMin) {
    console.log('canIssueCommand return: tap at min');
    return { allowed: false, reason: "Cannot lower tap: already at minimum position" }
  }
  if (direction === "raise" && transformer.tapPosition >= tapLimitMax) {
    console.log('canIssueCommand return: tap at max');
    return { allowed: false, reason: "Cannot raise tap: already at maximum position" }
  }

  // Rule 2: Follower in manual mode
  if (transformer.masterFollower?.isFollower && transformer.mode === "manual") {
    console.log('canIssueCommand return: follower in manual');
    return { allowed: false, reason: "Cannot issue command: Follower in manual mode" }
  }

  // Rule 5: TC error conditions
  if (!transformer.interlocks) {
    return { allowed: false, reason: "Interlock status not available" }
  }
  if (
    transformer.interlocks.tapChangerInProgress ||
    transformer.interlocks.tapChangerStuck
  ) {
    console.log('canIssueCommand return: TC error/in progress');
    return { allowed: false, reason: "TC error/in progress - commands blocked" }
  }

  // Standard deviation check for auto mode (replaces tolerance band check)
  if (transformer.mode === "auto") {
    const lower = transformer.voltageBand?.lower ?? transformer.lowerVoltage ?? 0;
    const upper = transformer.voltageBand?.upper ?? transformer.upperVoltage ?? 0;
    const mean = (lower + upper) / 2;
    const threshold = typeof transformer.threshold === "number" ? transformer.threshold : 0;
    const thresholdValue = mean * (threshold / 100);
    const voltage = transformer.voltage * 100; // Ensure same scale as band
    if (voltage >= lower && voltage <= upper) {
      if (direction === "raise" && voltage < mean - thresholdValue) {
        return { allowed: true, reason: "Auto: voltage below mean-threshold, raise tap" };
      }
      if (direction === "lower" && voltage > mean + thresholdValue) {
        return { allowed: true, reason: "Auto: voltage above mean+threshold, lower tap" };
      }
      return { allowed: false, reason: "Voltage within threshold range - no command needed" };
    }
    return { allowed: false, reason: "Voltage out of band - no command issued" };
  }

  // Rule 8: Overcurrent check (both overcurrent limit and rated current)
  if (
    transformer.interlocks.overCurrent ||
    checkOverCurrent(transformer.currentRating.currentValue, transformer.currentRating.overCurrentLimit) ||
    transformer.currentRating.currentValue > transformer.currentRating.ratedCurrent
  ) {
    console.log('canIssueCommand return: overcurrent');
    return {
      allowed: false,
      reason:
        transformer.currentRating.currentValue > transformer.currentRating.ratedCurrent
          ? `Current exceeds rated value (${transformer.currentRating.currentValue}A > ${transformer.currentRating.ratedCurrent}A)`
          : "Overcurrent condition - commands blocked",
    }
  }

  // Rule 11: Voltage signal validity
  if (!transformer.voltageSignalValid) {
    console.log('canIssueCommand return: invalid voltage signal');
    return { allowed: false, reason: "Invalid voltage signal - commands blocked" }
  }

  console.log('canIssueCommand return: allowed');
  return { allowed: true, reason: "" }
}

export function useTransformers() {
  const [transformers, setTransformers] = useState<Transformer[]>([])
  const [savedTransformers, setSavedTransformers] = useState<Transformer[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [modeChangeLoading, setModeChangeLoading] = useState<Set<string>>(new Set())
  const [tapChangeLoading, setTapChangeLoading] = useState<Set<string>>(new Set())
  const [lastTapChangeTime, setLastTapChangeTime] = useState<Map<string, number>>(new Map())
  const [commandDelay, setCommandDelay] = useState(11) // Default 11 seconds

  // Fetch real transformers on mount (no more merging with mock)
  const refreshTransformers = useCallback(async () => {
      try {
        const res = await fetch('/avr/api/transformers/list');
        const data = await res.json();
      if (Array.isArray(data.transformers)) {
          setTransformers(data.transformers);
        }
      } catch (e) {
      // Optionally handle error
      }
  }, []);

  useEffect(() => {
    refreshTransformers();
  }, [refreshTransformers]);

  const updateTransformerMode = useCallback(async (transformerId: string, mode: "auto" | "manual") => {
    // Set loading state
    setModeChangeLoading((prev) => new Set(prev).add(transformerId))

    try {
      // 5 second delay for mode change
      await new Promise((resolve) => setTimeout(resolve, 5000))

      setTransformers((prev) => {
        const updated = prev.map((transformer) =>
          transformer.id === transformerId ? { ...transformer, mode } : transformer,
        )
        setHasUnsavedChanges(true)
        return updated
      })

      // Find the transformer and get its deviceId
      const transformer = transformers.find(t => t.id === transformerId || t.deviceId === transformerId);
      const deviceIdToSend = transformer?.deviceId || transformerId;
      const payload = { deviceId: deviceIdToSend, mode };
      console.log('Updating mode with payload:', payload);
      // Update mode in userTransformers collection
      const res = await fetch('/avr/api/transformers/update-user-transformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update mode');
      }
    } finally {
      // Remove loading state
      setModeChangeLoading((prev) => {
        const newSet = new Set(prev)
        newSet.delete(transformerId)
        return newSet
      })
    }
  }, [])

  // Update the updateTapPosition function to include AVR logic
  const updateTapPosition = useCallback(
    async (deviceId: string, direction: "raise" | "lower", voltageSignalValid?: boolean) => {
      console.log('updateTapPosition called with:', { deviceId, direction });
      if (!deviceId || typeof deviceId !== 'string') {
        console.error('Invalid deviceId for tap command:', deviceId);
        throw new Error('Invalid deviceId for tap command');
      }
      if (direction !== 'raise' && direction !== 'lower') {
        console.error('Invalid direction for tap command:', direction);
        throw new Error('Invalid direction for tap command');
      }
      const transformer = transformers.find((t) => t.deviceId === deviceId || t.id === deviceId)
      console.log('Found transformer:', transformer);
      if (!transformer) return;

      // Use the passed voltageSignalValid if provided
      const transformerForCommand = {
        ...transformer,
        voltageSignalValid: voltageSignalValid !== undefined ? voltageSignalValid : transformer.voltageSignalValid,
      };
      let commandCheck;
      try {
        commandCheck = canIssueCommand(transformerForCommand, direction);
        console.log('Command check result:', commandCheck);
        if (!commandCheck.allowed) {
          console.log('Command not allowed:', commandCheck.reason);
          throw new Error(commandCheck.reason);
        }
      } catch (err) {
        console.error('Error in canIssueCommand or command check:', err);
        throw err;
      }

      const now = Date.now();
      const lastTime = lastTapChangeTime.get(deviceId) || 0;
      const timeSinceLastCommand = now - lastTime;
      console.log('Cooldown check:', { now, lastTime, timeSinceLastCommand, commandDelay });

      if (timeSinceLastCommand < commandDelay * 1000) {
        const remainingTime = Math.ceil((commandDelay * 1000 - timeSinceLastCommand) / 1000);
        console.log('Cooldown not satisfied, remaining:', remainingTime);
        throw new Error(`Please wait ${remainingTime} more seconds before next command`);
      }

      // Log the payload before making the API call
      console.log('Issuing tap command via API:', { deviceId, direction });
      setTapChangeLoading((prev) => new Set(prev).add(deviceId))

      try {
        // Call the real backend API to issue the tap command
        const res = await fetch('/avr/api/transformers/issue-tap-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, direction }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to issue tap command');
        }

        // Optionally, wait a bit and refresh transformers to get the new tap position
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refreshTransformers();

        setLastTapChangeTime((prev) => new Map(prev).set(deviceId, now))
      } finally {
        setTapChangeLoading((prev) => {
          const newSet = new Set(prev)
          newSet.delete(deviceId)
          return newSet
        })
      }
    },
    [commandDelay, lastTapChangeTime, transformers, refreshTransformers],
  )

  const updateMasterFollower = useCallback(async (masterId: string, followerIds: string[]) => {
    // Update local state for immediate UI feedback
    setTransformers((prev) => {
      const updated = prev.map((transformer) => {
        if (transformer.deviceId === masterId) {
          const updatedTransformer = {
            ...transformer,
            masterFollower: {
              isMaster: true,
              isFollower: false,
              masterId: null,
              followerIds,
            },
          }
          return {
            ...updatedTransformer,
            type: getTransformerType(updatedTransformer),
          }
        } else if (followerIds.includes(transformer.deviceId || "")) {
          const updatedTransformer = {
            ...transformer,
            masterFollower: {
              isMaster: false,
              isFollower: true,
              masterId,
              followerIds: null,
            },
          }
          return {
            ...updatedTransformer,
            type: getTransformerType(updatedTransformer),
          }
        } else {
          const updatedTransformer = {
            ...transformer,
            masterFollower: null,
          }
          return {
            ...updatedTransformer,
            type: getTransformerType(updatedTransformer),
          }
        }
      })
      setHasUnsavedChanges(true)
      return updated
    })
    // --- Backend update ---
    try {
      const payload = {
        deviceId: masterId,
        masterFollowerConfig: {
          master: masterId,
          followers: followerIds,
        },
      };
      const res = await fetch('/avr/api/transformers/update-user-transformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update master-follower config');
      }
      // Refresh transformers from backend
      await refreshTransformers();
    } catch (err) {
      console.error('Failed to update master-follower config in backend:', err);
    }
  }, [refreshTransformers])

  const updateCommandDelay = useCallback((newDelay: number) => {
    if (newDelay >= 11) {
      setCommandDelay(newDelay)
      setHasUnsavedChanges(true)
    }
  }, [])

  const getRemainingCooldown = useCallback(
    (transformerId: string) => {
      const now = Date.now()
      const lastTime = lastTapChangeTime.get(transformerId) || 0
      const timeSinceLastCommand = now - lastTime
      const remainingTime = Math.max(0, commandDelay * 1000 - timeSinceLastCommand)
      return Math.ceil(remainingTime / 1000)
    },
    [commandDelay, lastTapChangeTime],
  )

  const saveChanges = useCallback(async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, this would make an API call to save the data
    setSavedTransformers([...transformers])
    setHasUnsavedChanges(false)

    console.log("Saved transformer configurations:", transformers)
  }, [transformers])

  // Add function to update tolerance band
  const updateToleranceBand = useCallback((transformerId: string, tolerancePercentage: number) => {
    if (tolerancePercentage < 0.5 || tolerancePercentage > 5) {
      throw new Error("Tolerance percentage must be between 0.5% and 5%")
    }

    setTransformers((prev) => {
      const updated = prev.map((transformer) => {
        if (transformer.id === transformerId) {
          const { lowerLimit, upperLimit } = calculateToleranceBand(
            transformer.toleranceBand.referenceVoltage,
            tolerancePercentage,
          )
          return {
            ...transformer,
            toleranceBand: {
              ...transformer.toleranceBand,
              tolerancePercentage,
              lowerLimit,
              upperLimit,
            },
          }
        }
        return transformer
      })
      setHasUnsavedChanges(true)
      return updated
    })
  }, [])

  // Add function to update current rating
  const updateCurrentRating = useCallback((transformerId: string, ratedCurrent: number, overCurrentLimit: number) => {
    setTransformers((prev) => {
      const updated = prev.map((transformer) => {
        if (transformer.id === transformerId) {
          return {
            ...transformer,
            currentRating: {
              ...transformer.currentRating,
              ratedCurrent,
              overCurrentLimit,
            },
          }
        }
        return transformer
      })
      setHasUnsavedChanges(true)
      return updated
    })
  }, [])

  // Add function to add a new transformer with mock data
  const addTransformer = useCallback((id: string, name: string) => {
    const mockTemplate = initialTransformers[0]; // Use the first mock as a template
    const newTransformer = {
      ...mockTemplate,
      id,
      name,
    };
    setTransformers((prev) => [...prev, newTransformer]);
    setHasUnsavedChanges(true);
  }, []);

  // Return the new functions
  return {
    transformers,
    updateTransformerMode,
    updateTapPosition,
    updateMasterFollower,
    updateCommandDelay,
    updateToleranceBand,
    updateCurrentRating,
    saveChanges,
    hasUnsavedChanges,
    modeChangeLoading,
    tapChangeLoading,
    commandDelay,
    getRemainingCooldown,
    addTransformer,
    refreshTransformers,
  }
}

export { canIssueCommand };
