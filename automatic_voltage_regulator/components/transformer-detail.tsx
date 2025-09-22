"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Users,
  Settings,
  Info,
  Clock,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Transformer } from "@/types/transformer"
import { InterlockStatus } from "@/components/interlock-status"
import { EnhancedVoltageChart } from "@/components/enhanced-voltage-chart"
import { LogExportDialog } from "@/components/log-export-dialog"
import { ExportManager } from "@/utils/export-helpers"
import { TransformerNameChip } from "@/components/transformer-name-chip"
import { useToast } from "@/hooks/use-toast"
import { EnhancedCurrentChart } from "@/components/enhanced-current-chart"
import { canIssueCommand } from "@/hooks/use-transformers"
import { TransformerStatusSection } from "@/components/transformer-status-section"
import { TransformerQuickControls } from "@/components/transformer-quick-controls"
import { TransformerTrends } from "@/components/transformer-trends"
import { TransformerErrorBoundary } from "@/components/transformer-error-boundary"

interface TransformerDetailProps {
  transformer: Transformer
  onClose: () => void
  onModeChange: (transformerId: string, mode: "auto" | "manual") => void
  onTapChange: (transformerId: string, direction: "raise" | "lower", voltageSignalValid?: boolean) => Promise<void>
  transformers: Transformer[]
  modeChangeLoading: Set<string>
  tapChangeLoading: Set<string>
  commandDelay: number
  onCommandDelayChange: (delay: number) => void
  getRemainingCooldown: (transformerId: string) => number
  refreshTransformers: () => Promise<void> // <-- add this prop
}

function displayValue(value: any, unit: string = ""): string {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number" && isNaN(value)) return "N/A";
  return unit ? `${value} ${unit}` : `${value}`;
}

export function TransformerDetail({
  transformer,
  onClose,
  onModeChange,
  onTapChange,
  transformers,
  modeChangeLoading,
  tapChangeLoading,
  commandDelay,
  onCommandDelayChange,
  getRemainingCooldown,
  refreshTransformers, // <-- add this prop
}: TransformerDetailProps) {
  console.log('TransformerDetail rendered for transformer:', transformer);
  // Defensive fallback for voltageBand
  const safeTransformer = {
    ...transformer,
    voltageBand: transformer.voltageBand || { lower: 0, upper: 0 },
  };
  const [upperVoltage, setUpperVoltage] = useState<number | string>(transformer.upperVoltage ?? safeTransformer.voltageBand.upper ?? 0);
  const [lowerVoltage, setLowerVoltage] = useState<number | string>(transformer.lowerVoltage ?? safeTransformer.voltageBand.lower ?? 0);
  const [bandLoading, setBandLoading] = useState(false);
  const [showTapChangeExport, setShowEventExport] = useState(false)
  const [showEventExport, setShowTapChangeExport] = useState(false)
  const [cooldownTimer, setCooldownTimer] = useState(0)
  const [localCommandDelay, setLocalCommandDelay] = useState(commandDelay)
  const { toast } = useToast()
  const [liveTapPosition, setLiveTapPosition] = useState<number | null>(null);
  const [tapPositionLoading, setTapPositionLoading] = useState<boolean>(true);
  const [tapPositionError, setTapPositionError] = useState<string | null>(null);
  const [liveVoltage, setLiveVoltage] = useState<number | null>(null);
  const [voltageLoading, setVoltageLoading] = useState<boolean>(true);
  const [tapLimitMin, setTapLimitMin] = useState<number | string>(transformer.tapLimits?.min ?? 1);
  const [tapLimitMax, setTapLimitMax] = useState<number | string>(transformer.tapLimits?.max ?? 21);
  const [tapLimitLoading, setTapLimitLoading] = useState(false);
  const [minDelay, setMinDelay] = useState<number | string>((transformer as any).minDelay ?? 11);
  const [minDelayLoading, setMinDelayLoading] = useState(false);
  const [ratedCurrent, setRatedCurrent] = useState<number | string>(transformer.currentRating.ratedCurrent);
  const [overCurrentLimit, setOverCurrentLimit] = useState<number | string>(transformer.currentRating.overCurrentLimit);
  const [currentSaveLoading, setCurrentSaveLoading] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">(transformer.mode);
  const [liveTransformer, setLiveTransformer] = useState<Transformer>(transformer);

  // State for live current value in settings
  const [liveCurrent, setLiveCurrent] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState<boolean>(true);
  const [currentError, setCurrentError] = useState<string | null>(null);

  // Add state for input errors
  const [inputErrors, setInputErrors] = useState({
    lowerVoltage: false,
    upperVoltage: false,
    tapLimitMin: false,
    tapLimitMax: false,
    minDelay: false,
    ratedCurrent: false,
    overCurrentLimit: false,
    threshold: false,
  });

  const [voltageSignalValid, setVoltageSignalValid] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number | string>(typeof transformer.threshold === 'number' ? transformer.threshold : 0);

  const isModeChanging = modeChangeLoading.has(transformer.id)
  const isTapChanging = tapChangeLoading.has(transformer.id)

  // --- Status logic for Overview section (same as card) ---
  const allowedInterlockKeys = [
    "tapChangerInProgress",
    "tapChangerStuck",
    "overCurrent",
    "voltageError",
  ];
  const overviewHasActiveInterlock = Object.entries(liveTransformer.interlocks || {})
    .filter(([key]) => allowedInterlockKeys.includes(key))
    .some(([, value]) => value);

  const overviewVoltageBand = useMemo(() => liveTransformer.voltageBand || {
    lower: typeof liveTransformer.lowerVoltage !== 'undefined' ? Number(liveTransformer.lowerVoltage) : 0,
    upper: typeof liveTransformer.upperVoltage !== 'undefined' ? Number(liveTransformer.upperVoltage) : 0,
  }, [liveTransformer.voltageBand, liveTransformer.lowerVoltage, liveTransformer.upperVoltage]);

  const overviewCurrentError = useMemo(() =>
    typeof liveCurrent === 'number' &&
    (
      (liveTransformer.currentRating?.ratedCurrent !== undefined && liveCurrent > liveTransformer.currentRating.ratedCurrent) ||
      (liveTransformer.currentRating?.overCurrentLimit !== undefined && liveCurrent > liveTransformer.currentRating.overCurrentLimit)
    ), [liveCurrent, liveTransformer.currentRating]);

  // Update: Compare (liveVoltage * 100) to overviewVoltageBand
  const overviewVoltageError = useMemo(() =>
    typeof liveVoltage === 'number' &&
    ((liveVoltage * 100) < overviewVoltageBand.lower || (liveVoltage * 100) > overviewVoltageBand.upper),
    [liveVoltage, overviewVoltageBand]
  );

  const overviewStatus = useMemo(() =>
    overviewVoltageError || overviewCurrentError
      ? "error"
      : overviewHasActiveInterlock
        ? "warning"
        : "normal",
    [overviewVoltageError, overviewCurrentError, overviewHasActiveInterlock]
  );

  // Update cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingCooldown(transformer.id)
      setCooldownTimer(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [transformer.id, getRemainingCooldown])

  // Poll latest tap position and voltage every 10 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchLiveData = () => {
      if (!isMounted) return;
      setTapPositionLoading(true);
      setTapPositionError(null);
      setVoltageLoading(true);
      fetch(`/avr/api/transformers/latest-tap-position?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            if (typeof data.tapPosition === 'number') {
              setLiveTapPosition(data.tapPosition);
              setTapPositionError(null);
            } else {
              setLiveTapPosition(null);
              setTapPositionError(data.error || 'No tap position data');
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            setLiveTapPosition(null);
            setTapPositionError('Error fetching tap position');
          }
        })
        .finally(() => {
          if (isMounted) setTapPositionLoading(false);
        });
      fetch(`/avr/api/transformers/latest-voltage?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            if (typeof data.voltage === 'number') {
              setLiveVoltage(data.voltage);
              setVoltageSignalValid(true);
            } else {
              setLiveVoltage(null);
              setVoltageSignalValid(false);
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            setLiveVoltage(null);
            setVoltageSignalValid(false);
          }
        })
        .finally(() => {
          if (isMounted) setVoltageLoading(false);
        });
    };
    fetchLiveData(); // Initial fetch
    const interval = setInterval(fetchLiveData, 10000); // Poll every 10 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [transformer.deviceId, transformer.id]);

  useEffect(() => {
    let isMounted = true;
    setLoadingCurrent(true);
    setCurrentError(null);
    setCurrentTime(null);
    fetch(`/avr/api/transformers/latest-current?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (typeof data.current === 'number') {
            setLiveCurrent(data.current);
            setCurrentTime(data.time || null);
            setCurrentError(null);
          } else {
            setLiveCurrent(null);
            setCurrentTime(null);
            setCurrentError(data.error || 'No current data');
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLiveCurrent(null);
          setCurrentTime(null);
          setCurrentError('Error fetching current');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCurrent(false);
      });
    return () => { isMounted = false; };
  }, [transformer.deviceId, transformer.id]);

  // Fetch latest transformer from backend on open and after save
  const fetchLatestTransformer = async () => {
    try {
      const res = await fetch(`/avr/api/transformers/list`);
      const json = await res.json();
      if (Array.isArray(json.transformers)) {
        const updated = json.transformers.find((t: any) => t.deviceId === (transformer.deviceId || transformer.id));
        if (updated) {
          setLiveTransformer(updated);
          setUpperVoltage(updated.upperVoltage ?? updated.voltageBand?.upper ?? '');
          setLowerVoltage(updated.lowerVoltage ?? updated.voltageBand?.lower ?? '');
          setTapLimitMin(updated.tapLimitMin ?? updated.tapLimits?.min ?? '');
          setTapLimitMax(updated.tapLimitMax ?? updated.tapLimits?.max ?? '');
          setMinDelay(updated.minDelay ?? '');
          setRatedCurrent(updated.currentRating?.ratedCurrent ?? '');
          setOverCurrentLimit(updated.currentRating?.overCurrentLimit ?? '');
          setMode(updated.mode ?? 'manual');
          setThreshold(typeof updated.threshold === 'number' ? updated.threshold : 0);
        }
      }
    } catch {}
  };
  useEffect(() => { fetchLatestTransformer(); }, [transformer.deviceId, transformer.id]);

  // Use liveTransformer for all settings fields (voltage band, tap limits, min delay, current rating, etc.)
  // After any save, call fetchLatestTransformer() and update UI

  const [savingSettings, setSavingSettings] = useState(false); // unified loading state

  const handleVoltageBandChange = async () => {
    setBandLoading(true);
    setSavingSettings(true);
    try {
      const res = await fetch('/avr/api/transformers/update-user-transformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: transformer.deviceId || transformer.id,
          upperVoltage: Number(upperVoltage),
          lowerVoltage: Number(lowerVoltage),
          threshold: Number(threshold),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update voltage band');
      toast({ title: 'Voltage Band Updated', description: 'Band settings saved successfully', duration: 3000, variant: 'success' });
      await fetchLatestTransformer();
      await refreshTransformers(); // <-- parent/global refresh
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update voltage band', variant: 'destructive', duration: 3000 });
    } finally {
      setBandLoading(false);
      setSavingSettings(false);
    }
  };

  const handleTapLimitChange = async () => {
    setTapLimitLoading(true);
    setSavingSettings(true);
    try {
      const res = await fetch('/avr/api/transformers/update-user-transformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: transformer.deviceId || transformer.id,
          tapLimitMin: Number(tapLimitMin),
          tapLimitMax: Number(tapLimitMax),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update tap limits');
      toast({ title: 'Tap Limits Updated', description: 'Tap limits saved successfully', duration: 3000, variant: 'success' });
      await fetchLatestTransformer();
      await refreshTransformers(); // <-- parent/global refresh
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update tap limits', variant: 'destructive', duration: 3000 });
    } finally {
      setTapLimitLoading(false);
      setSavingSettings(false);
    }
  };

  const handleModeChange = useCallback(async (newMode: "auto" | "manual") => {
    setSavingSettings(true);
    try {
      await onModeChange(transformer.deviceId || transformer.id, newMode)
      setMode(newMode)
      toast({
        title: "Mode Changed",
        description: `Transformer mode changed to ${newMode}`,
        duration: 3000,
        variant: 'success',
      })
      await fetchLatestTransformer();
      await refreshTransformers(); // <-- parent/global refresh
    } catch (error) {
      toast({
        title: "Mode Change Failed",
        description: "Failed to change transformer mode",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setSavingSettings(false);
    }
  }, [onModeChange, transformer.deviceId, transformer.id, toast, fetchLatestTransformer, refreshTransformers])

  // Add state for tap command cooldown
  const [tapCooldown, setTapCooldown] = useState(0);
  const minDelaySeconds = Number((liveTransformer?.minDelay ?? transformer.minDelay ?? 11));
  const tapCooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start cooldown after tap command
  const startTapCooldown = useCallback(() => {
    // Clear any existing cooldown interval
    if (tapCooldownIntervalRef.current) {
      clearInterval(tapCooldownIntervalRef.current);
    }

    setTapCooldown(minDelaySeconds);
    tapCooldownIntervalRef.current = setInterval(() => {
      setTapCooldown(prev => {
        if (prev <= 1) {
          if (tapCooldownIntervalRef.current) {
            clearInterval(tapCooldownIntervalRef.current);
            tapCooldownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [minDelaySeconds]);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (tapCooldownIntervalRef.current) {
        clearInterval(tapCooldownIntervalRef.current);
      }
    };
  }, []);

  // Add state for tap command loading
  const [tapCommandLoading, setTapCommandLoading] = useState<"raise" | "lower" | null>(null);

  // Compute voltage error for tap control logic
  const voltageErrorForTap = useMemo(() => 
    typeof liveVoltage === 'number' && ((liveVoltage * 100) < overviewVoltageBand.lower || (liveVoltage * 100) > overviewVoltageBand.upper),
    [liveVoltage, overviewVoltageBand]
  );

  // Update handleTapChange to start cooldown and show loading
  const handleTapChangeWithCooldown = useCallback(async (direction: "raise" | "lower") => {
    if (voltageErrorForTap) return;
    if (tapCooldown > 0) return;
    setTapCommandLoading(direction);
    startTapCooldown(); // Start cooldown immediately
    await handleTapChange(direction);
    setTapCommandLoading(null);
  }, [voltageErrorForTap, tapCooldown, startTapCooldown]);

  // Update handleTapChange to show toast based on API response
  const handleTapChange = async (direction: "raise" | "lower") => {
    console.log("handleTapChange called with direction:", direction);
    // Check interlocks before allowing tap change
    if (Object.values(transformer.interlocks || {}).some((value) => value)) {
      toast({
        title: "Command Blocked",
        description: "Cannot change tap: interlock active",
        variant: "destructive",
        duration: 3000,
      })
      return
    }
    try {
      // Compose a transformer object with the latest voltage and voltageSignalValid
      const transformerForCommand = {
        ...transformer,
        voltage: typeof liveVoltage === 'number' ? liveVoltage : 0,
        voltageSignalValid,
      };
      const commandCheck = canIssueCommand(transformerForCommand, direction);
      if (!commandCheck.allowed) {
        throw new Error(commandCheck.reason);
      }
      // Call the backend API directly for tap command
      const res = await fetch('/avr/api/transformers/issue-tap-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: transformer.deviceId || transformer.id, direction }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to change tap position');
      }
      // Custom toast logic for automation response
      if (json.data && typeof json.data.success === 'boolean') {
        if (json.data.success === true) {
      toast({
        title: "Tap Changed",
        description: `Tap ${direction}d successfully`,
        duration: 3000,
        variant: 'success',
          });
        } else {
          toast({
            title: "Automation Failed",
            description: 'Tap command failed on device.',
            duration: 3000,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: "Tap Changed",
          description: `Tap ${direction}d successfully`,
          duration: 3000,
          variant: 'success',
        });
      }
    } catch (error: any) {
      let description = error instanceof Error ? error.message : "Failed to change tap position";
      if (description.includes('timeout')) {
        description = 'No response from device (timeout)';
      }
      toast({
        title: "Command Failed",
        description,
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleCommandDelayChange = () => {
    if (localCommandDelay >= 11) {
      onCommandDelayChange(localCommandDelay)
      toast({
        title: "Settings Updated",
        description: `Command delay updated to ${localCommandDelay} seconds`,
        duration: 3000,
        variant: 'success',
      })
    } else {
      toast({
        title: "Invalid Setting",
        description: "Command delay cannot be less than 11 seconds",
        variant: "destructive",
        duration: 3000,
      })
      setLocalCommandDelay(commandDelay) // Reset to current value
    }
  }

  // Compute live interlocks using latest MQTT data
  const tapChangerInProgress =
    transformer.D46 === undefined || transformer.D46 === null
      ? 'N/A'
      : transformer.D46 === 1;
  const tapChangerStuck =
    transformer.D11 === undefined || transformer.D11 === null
      ? 'N/A'
      : transformer.D11 === 1;
  const overCurrent =
    transformer.D151 === undefined || transformer.D151 === null || !transformer.currentRating || transformer.currentRating.ratedCurrent === undefined
      ? 'N/A'
      : transformer.D151 > transformer.currentRating.ratedCurrent;
  const voltageErrorInterlock =
    transformer.D150 === undefined || transformer.D150 === null || transformer.D150 === 0
      ? 'N/A'
      : false;

  // Prepare the interlocks object for InterlockStatus
  const interlocksForStatus = {
    tapChangerInProgress: tapChangerInProgress === 'N/A' ? false : tapChangerInProgress,
    tapChangerStuck: tapChangerStuck === 'N/A' ? false : tapChangerStuck,
    motorFault: false, // Not computed
    manualLock: false, // Not computed
    tcInRemote: false, // Not computed
    tcControlSupplyFail: false, // Not computed
    overCurrent: overCurrent === 'N/A' ? false : overCurrent,
    voltageError: typeof transformer.interlocks?.voltageError === 'boolean' ? transformer.interlocks.voltageError : false,
  };

  // Mock data for event log
  const eventLogData = [
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toLocaleString(),
      type: "Band Violation",
      severity: "Warning",
      description: "Voltage exceeded upper band limit",
      additionalData: "Voltage: 235V, Upper Limit: 231V",
      acknowledged: false,
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toLocaleString(),
      type: "Mode Change",
      severity: "Info",
      description: "Operation mode changed from Manual to Auto",
      additionalData: "Changed by: User admin",
      acknowledged: true,
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleString(),
      type: "Interlock",
      severity: "Critical",
      description: "Tap Changer Stuck interlock activated",
      additionalData: "Motor position feedback lost",
      acknowledged: true,
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toLocaleString(),
      type: "Communication",
      severity: "Warning",
      description: "Voltage reference signal lost",
      additionalData: "MFM communication timeout",
      acknowledged: true,
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 22).toLocaleString(),
      type: "System",
      severity: "Info",
      description: "AVR system started",
      additionalData: "System initialization completed",
      acknowledged: true,
    },
  ]

  const handleTapChangeExport = (options: any) => {
    // Filter data based on options and export
    console.log("Exporting tap change log with options:", options)
    if (options.format === "csv") {
      ExportManager.exportTapChangeLogToCSV([], transformer.name)
    } else {
      ExportManager.exportTapChangeLogToExcel([], transformer.name)
    }
  }

  const handleEventExport = (options: any) => {
    // Filter data based on options and export
    console.log("Exporting event log with options:", options)
    if (options.format === "csv") {
      ExportManager.exportEventLogToCSV(eventLogData, transformer.name)
    } else {
      ExportManager.exportEventLogToExcel(eventLogData, transformer.name)
    }
  }

  const tapMin = transformer.tapLimits?.min ?? (transformer as any).tapLimitMin ?? 1;
  const tapMax = transformer.tapLimits?.max ?? (transformer as any).tapLimitMax ?? 21;

  // --- Save Min Delay ---
  const handleMinDelayChange = async () => {
    setMinDelayLoading(true);
    setSavingSettings(true);
    try {
      const res = await fetch('/avr/api/transformers/update-user-transformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: transformer.deviceId || transformer.id,
          minDelay: Number(minDelay),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update min delay');
      toast({ title: 'Min Delay Updated', description: 'Minimum delay saved successfully', duration: 3000, variant: 'success' });
      await fetchLatestTransformer();
      await refreshTransformers(); // <-- parent/global refresh
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update min delay', variant: 'destructive', duration: 3000 });
    } finally {
      setMinDelayLoading(false);
      setSavingSettings(false);
    }
  };

  const handleCurrentRatingSave = async () => {
    setCurrentSaveLoading(true);
    setSavingSettings(true);
    try {
      const res = await fetch('/avr/api/transformers/update-user-transformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: transformer.deviceId || transformer.id,
          ratedCurrent: Number(ratedCurrent),
          overCurrentLimit: Number(overCurrentLimit),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update current rating');
      toast({ title: 'Current Rating Updated', description: 'Current rating settings saved successfully', duration: 3000, variant: 'success' });
      await fetchLatestTransformer();
      await refreshTransformers(); // <-- parent/global refresh
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update current rating', variant: 'destructive', duration: 3000 });
    } finally {
      setCurrentSaveLoading(false);
      setSavingSettings(false);
    }
  };

  // Add this useEffect after liveVoltage is updated
  // Add this function for auto tap command
  const issueAutoTapCommand = async (direction: "raise" | "lower") => {
    setTapCommandLoading(direction);
    try {
      const res = await fetch('/avr/api/transformers/issue-auto-tap-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: transformer.deviceId || transformer.id, direction }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to issue auto tap command');
      setCooldownTimer(commandDelay);
      toast({
        title: `Auto Tap ${direction === 'raise' ? 'Raise' : 'Lower'} Successful`,
        description: `Tap ${direction}d successfully`,
        duration: 3000,
        variant: 'success',
      });
    } catch (error: any) {
      let description = error instanceof Error ? error.message : 'Failed to issue auto tap command';
      if (description.includes('timeout')) {
        description = 'No response from device (timeout)';
      }
      toast({
        title: 'Auto Command Failed',
        description,
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setTapCommandLoading(null);
    }
  };
  useEffect(() => {
    console.debug('[AUTO TAP DEBUG]', {
      mode: transformer.mode,
      liveVoltage,
      tapChangeLoading: tapChangeLoading.has(transformer.id),
      cooldown: getRemainingCooldown(transformer.id),
      voltageErrorForTap,
      threshold,
      lowerVoltage: liveTransformer.lowerVoltage,
      upperVoltage: liveTransformer.upperVoltage,
    });
    if (
      transformer.mode === "auto" &&
      typeof liveVoltage === "number" &&
      !tapChangeLoading.has(transformer.id) &&
      !voltageErrorForTap
    ) {
      const calcVoltage = liveVoltage * 100;
      const lowerBand = typeof liveTransformer.lowerVoltage === 'number' ? liveTransformer.lowerVoltage : (liveTransformer.voltageBand?.lower ?? 0);
      const upperBand = typeof liveTransformer.upperVoltage === 'number' ? liveTransformer.upperVoltage : (liveTransformer.voltageBand?.upper ?? 0);
      const meanBand = (lowerBand + upperBand) / 2;
      const thresholdValue = meanBand * (Number(threshold) / 100);
      const cooldown = getRemainingCooldown(transformer.id);
      if (calcVoltage >= lowerBand && calcVoltage <= upperBand) {
        if (calcVoltage < meanBand - thresholdValue) {
          if (cooldown > 0) {
            toast({
              title: 'Auto Command Blocked',
              description: `Command not sent. Please wait ${cooldown} seconds before next command.`,
              variant: 'destructive',
              duration: 3000,
            });
            return;
          }
          console.debug('[AUTO TAP DEBUG] Issuing tap RAISE');
          issueAutoTapCommand("raise");
          toast({
            title: "Auto Tap Raise Issued",
            description: `Voltage (${calcVoltage.toFixed(0)}) below mean - threshold (${(meanBand - thresholdValue).toFixed(0)})`,
            duration: 3000,
            variant: 'success',
          });
          return;
        }
        if (calcVoltage > meanBand + thresholdValue) {
          if (cooldown > 0) {
            toast({
              title: 'Auto Command Blocked',
              description: `Command not sent. Please wait ${cooldown} seconds before next command.`,
              variant: 'destructive',
              duration: 3000,
            });
            return;
          }
          console.debug('[AUTO TAP DEBUG] Issuing tap LOWER');
          issueAutoTapCommand("lower");
          toast({
            title: "Auto Tap Lower Issued",
            description: `Voltage (${calcVoltage.toFixed(0)}) above mean + threshold (${(meanBand + thresholdValue).toFixed(0)})`,
            duration: 3000,
            variant: 'success',
          });
          return;
        }
        console.debug('[AUTO TAP DEBUG] Voltage within threshold range, no command issued');
      } else {
        console.debug('[AUTO TAP DEBUG] Voltage out of band, no command issued');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveVoltage, transformer.mode, transformer.id, transformer.deviceId, tapChangeLoading, getRemainingCooldown, threshold, liveTransformer.lowerVoltage, liveTransformer.upperVoltage]);

  // Add state for history toggle and data
  const [historyType, setHistoryType] = useState<'tap' | 'device' | 'setting'>('tap');
  const [tapChangeHistory, setTapChangeHistory] = useState<any[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add state for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Add state for pagination for device and setting history
  const [devicePage, setDevicePage] = useState(1);
  const [devicePageSize, setDevicePageSize] = useState(10);
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [settingPage, setSettingPage] = useState(1);
  const [settingPageSize, setSettingPageSize] = useState(10);
  const [settingTotal, setSettingTotal] = useState(0);

  // Update fetch logic for tap change history
  useEffect(() => {
    if (historyType === 'tap') {
      setHistoryLoading(true);
      fetch(`/avr/api/transformers/tap-change-log?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=${page}&pageSize=${pageSize}`)
        .then(res => res.json())
        .then(data => {
          setTapChangeHistory(Array.isArray(data.logs) ? data.logs : []);
          setTotal(data.total || 0);
        })
        .finally(() => setHistoryLoading(false));
    } else {
      setHistoryLoading(true);
      fetch(`/avr/api/transformers/device-history?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}`)
        .then(res => res.json())
        .then(data => setDeviceHistory(Array.isArray(data.history) ? data.history : []))
        .finally(() => setHistoryLoading(false));
    }
  }, [historyType, transformer.deviceId, transformer.id, page, pageSize]);

  // Update fetch logic for device and setting history
  useEffect(() => {
    if (historyType === 'device') {
      setHistoryLoading(true);
      fetch(`/avr/api/transformers/device-history?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=${devicePage}&pageSize=${devicePageSize}`)
        .then(res => res.json())
        .then(data => {
          setDeviceHistory(Array.isArray(data.history) ? data.history : []);
          setDeviceTotal(data.total || 0);
        })
        .finally(() => setHistoryLoading(false));
    } else if (historyType === 'setting') {
      setHistoryLoading(true);
      fetch(`/avr/api/transformers/device-history?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=${settingPage}&pageSize=${settingPageSize}`)
        .then(res => res.json())
        .then(data => {
          setDeviceHistory(Array.isArray(data.history) ? data.history : []);
          setSettingTotal(data.total || 0);
        })
        .finally(() => setHistoryLoading(false));
    }
  }, [historyType, transformer.deviceId, transformer.id, devicePage, devicePageSize, settingPage, settingPageSize]);

  // Add export handlers
  const handleExportTapChangeHistory = async () => {
    const res = await fetch(`/avr/api/transformers/tap-change-log?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=1&pageSize=10000`);
    const data = await res.json();
    ExportManager.exportTapChangeLogToCSV(data.logs, transformer.name);
  };
  const handleExportTapChangeHistoryExcel = async () => {
    const res = await fetch(`/avr/api/transformers/tap-change-log?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=1&pageSize=10000`);
    const data = await res.json();
    ExportManager.exportTapChangeLogToExcel(data.logs, transformer.name);
  };
  const handleExportSettingChangeHistory = async () => {
    const res = await fetch(`/avr/api/transformers/device-history?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=1&pageSize=10000`);
    const data = await res.json();
    ExportManager.exportSettingChangeLogToCSV(data.history, transformer.name);
  };
  const handleExportSettingChangeHistoryExcel = async () => {
    const res = await fetch(`/avr/api/transformers/device-history?deviceId=${encodeURIComponent(transformer.deviceId || transformer.id)}&page=1&pageSize=10000`);
    const data = await res.json();
    ExportManager.exportSettingChangeLogToExcel(data.history, transformer.name);
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full p-0 flex flex-col">
        <div className="px-6 pt-6 pb-2 border-b">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>Transformer Details:</span>
              <TransformerNameChip name={displayValue(transformer.deviceName || transformer.name)} type={transformer.type} maxLength={25} />
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <Tabs defaultValue="overview" className="flex flex-col h-full">
            {/* Tabs navigation */}
            <div className="border-b px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {/* <TabsTrigger value="control">Control</TabsTrigger> */}
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-4 pt-4 m-0 h-full">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TransformerErrorBoundary transformerId={transformer.id}>
                  <TransformerStatusSection
                    transformer={transformer}
                    liveTransformer={liveTransformer}
                    transformers={transformers}
                    liveVoltage={liveVoltage}
                    voltageLoading={voltageLoading}
                    liveTapPosition={liveTapPosition}
                    tapPositionLoading={tapPositionLoading}
                    tapPositionError={tapPositionError}
                    overviewStatus={overviewStatus}
                    overviewVoltageError={overviewVoltageError}
                    overviewVoltageBand={overviewVoltageBand}
                  />
                </TransformerErrorBoundary>

                <TransformerErrorBoundary transformerId={transformer.id}>
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-4 text-lg font-medium">Interlocks</h3>
                    <InterlockStatus interlocks={interlocksForStatus} />
                  </div>
                </TransformerErrorBoundary>
              </div>

              <TransformerErrorBoundary transformerId={transformer.id}>
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
                    {/* Optionally show master info if available */}
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
                            Current Tap Position: {typeof liveTapPosition === 'number' ? liveTapPosition.toFixed(2) : 'N/A'} (Range: {tapMin} -{" "}
                            {tapMax})
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
              </TransformerErrorBoundary>

              <TransformerErrorBoundary transformerId={transformer.id}>
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
                        voltageBand={{
                          lower: Number(liveTransformer.lowerVoltage ?? liveTransformer.voltageBand?.lower ?? 0),
                          upper: Number(liveTransformer.upperVoltage ?? liveTransformer.voltageBand?.upper ?? 0),
                        }}
                        currentVoltage={liveTransformer.voltage}
                        deviceId={liveTransformer.deviceId || liveTransformer.id}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="current" className="mt-4">
                    <div className="min-h-[300px] max-h-[400px]">
                      <EnhancedCurrentChart
                        currentRating={transformer.currentRating}
                        currentValue={transformer.currentRating.currentValue}
                        deviceId={transformer.deviceId || transformer.id}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                </div>
              </TransformerErrorBoundary>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 pt-4 m-0 h-full">
              <TransformerErrorBoundary transformerId={transformer.id}>
              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-lg font-medium">Voltage Band Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lower-band">Lower Band (V)</Label>
                    <Input
                      id="lower-band"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={lowerVoltage === 0 ? '' : lowerVoltage}
                      className={inputErrors.lowerVoltage ? 'border-red-500' : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setLowerVoltage('');
                          setInputErrors(errors => ({ ...errors, lowerVoltage: true }));
                        } else {
                          setLowerVoltage(Number(val));
                          setInputErrors(errors => ({ ...errors, lowerVoltage: false }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upper-band">Upper Band (V)</Label>
                    <Input
                      id="upper-band"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={upperVoltage === 0 ? '' : upperVoltage}
                      className={inputErrors.upperVoltage ? 'border-red-500' : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setUpperVoltage('');
                          setInputErrors(errors => ({ ...errors, upperVoltage: true }));
                        } else {
                          setUpperVoltage(Number(val));
                          setInputErrors(errors => ({ ...errors, upperVoltage: false }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Threshold (%)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={threshold === 0 ? '' : threshold}
                      className={inputErrors.threshold ? 'border-red-500' : ''}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setThreshold('');
                          setInputErrors(errors => ({ ...errors, threshold: true }));
                        } else {
                          const num = Number(val);
                          if (num < 0 || num > 100) {
                            setInputErrors(errors => ({ ...errors, threshold: true }));
                          } else {
                            setThreshold(num);
                            setInputErrors(errors => ({ ...errors, threshold: false }));
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleVoltageBandChange} disabled={savingSettings || bandLoading || inputErrors.lowerVoltage || inputErrors.upperVoltage || inputErrors.threshold || lowerVoltage === '' || upperVoltage === '' || threshold === ''}>
                  {(savingSettings || bandLoading) ? (<><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Saving...</>) : 'Save Band Settings'}
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-lg font-medium">Tap Position Limits</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-tap">Minimum Tap Position</Label>
                    <Input
                      id="min-tap"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tapLimitMin === 0 ? '' : tapLimitMin}
                      className={inputErrors.tapLimitMin ? 'border-red-500' : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setTapLimitMin('');
                          setInputErrors(errors => ({ ...errors, tapLimitMin: true }));
                        } else {
                          setTapLimitMin(Number(val));
                          setInputErrors(errors => ({ ...errors, tapLimitMin: false }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-tap">Maximum Tap Position</Label>
                    <Input
                      id="max-tap"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tapLimitMax === 0 ? '' : tapLimitMax}
                      className={inputErrors.tapLimitMax ? 'border-red-500' : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setTapLimitMax('');
                          setInputErrors(errors => ({ ...errors, tapLimitMax: true }));
                        } else {
                          setTapLimitMax(Number(val));
                          setInputErrors(errors => ({ ...errors, tapLimitMax: false }));
                        }
                      }}
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleTapLimitChange} disabled={savingSettings || tapLimitLoading || inputErrors.tapLimitMin || inputErrors.tapLimitMax || tapLimitMin === '' || tapLimitMax === ''}>
                  {(savingSettings || tapLimitLoading) ? (<><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Saving...</>) : 'Save Tap Limits'}
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-lg font-medium">Minimum Delay Between Commands</h3>
                <div className="flex items-center gap-4">
                      <Input
                    id="min-delay-seconds"
                        type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`w-32 ${inputErrors.minDelay ? 'border-red-500' : ''}`}
                    value={minDelay}
                        min={11}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setMinDelay(val);
                      if (val === '' || Number(val) < 11) {
                        setInputErrors(errors => ({ ...errors, minDelay: true }));
                      } else {
                        setInputErrors(errors => ({ ...errors, minDelay: false }));
                      }
                    }}
                      />
                  <Button onClick={handleMinDelayChange} disabled={savingSettings || minDelayLoading || inputErrors.minDelay || minDelay === ''}>
                    {(savingSettings || minDelayLoading) ? (<><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Saving...</>) : 'Save'}
                      </Button>
                    </div>
                <p className="text-xs text-gray-500 mt-2">Minimum allowed delay is 11 seconds.</p>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-lg font-medium">Current Rating Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rated-current">Rated Current (A)</Label>
                    <Input
                      id="rated-current"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={ratedCurrent === 0 ? '' : ratedCurrent}
                      className={inputErrors.ratedCurrent ? 'border-red-500' : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setRatedCurrent('');
                          setInputErrors(errors => ({ ...errors, ratedCurrent: true }));
                        } else {
                          setRatedCurrent(Number(val));
                          setInputErrors(errors => ({ ...errors, ratedCurrent: false }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overcurrent-limit">Overcurrent Limit (A)</Label>
                    <Input
                      id="overcurrent-limit"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={overCurrentLimit === 0 ? '' : overCurrentLimit}
                      className={inputErrors.overCurrentLimit ? 'border-red-500' : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val === '') {
                          setOverCurrentLimit('');
                          setInputErrors(errors => ({ ...errors, overCurrentLimit: true }));
                        } else {
                          setOverCurrentLimit(Number(val));
                          setInputErrors(errors => ({ ...errors, overCurrentLimit: false }));
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Value:</span>
                    <span className={`font-medium ${typeof liveCurrent === 'number' && !isNaN(Number(ratedCurrent)) && liveCurrent > Number(ratedCurrent) ? "text-red-600" : "text-green-600"}`}>
                      {loadingCurrent ? "Loading..." : currentError ? <span className="text-red-500">{currentError}</span> : `${liveCurrent !== null ? liveCurrent.toFixed(2) : "N/A"} A`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`font-medium ${typeof liveCurrent === 'number' && !isNaN(Number(ratedCurrent)) && liveCurrent > Number(ratedCurrent) ? "text-red-600" : "text-green-600"}`}>
                      {loadingCurrent || currentError ? "" : (typeof liveCurrent === 'number' && !isNaN(Number(ratedCurrent)) && liveCurrent > Number(ratedCurrent) ? "Over Rated Current" : "Normal")}
                    </span>
                  </div>
                  {currentTime && (
                    <div className="text-xs text-gray-400">{new Date(currentTime).toLocaleString()}</div>
                  )}
                </div>
                <Button className="mt-4" onClick={handleCurrentRatingSave} disabled={savingSettings || currentSaveLoading || inputErrors.ratedCurrent || inputErrors.overCurrentLimit || ratedCurrent === '' || overCurrentLimit === ''}>
                  {(savingSettings || currentSaveLoading) ? (<><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Saving...</>) : 'Save Current Settings'}
                </Button>
              </div>
              </TransformerErrorBoundary>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 pt-4 m-0 h-full">
              <TransformerErrorBoundary transformerId={transformer.id}>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">History</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={historyType === 'tap' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setHistoryType('tap')}
                    >
                      Tap Change History
                    </Button>
                    <Button
                      variant={historyType === 'setting' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setHistoryType('setting')}
                    >
                      Setting Change History
                    </Button>
                  </div>
                </div>
                {historyLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : historyType === 'tap' ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div></div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleExportTapChangeHistory}>Export CSV</Button>
                        <Button size="sm" variant="outline" onClick={handleExportTapChangeHistoryExcel}>Export Excel</Button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-sm font-medium text-gray-500">
                            <th className="pb-2">Timestamp</th>
                            <th className="pb-2">Action</th>
                            <th className="pb-2">Mode</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tapChangeHistory.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-4 text-gray-400">No tap change history found.</td></tr>
                          ) : tapChangeHistory.map((log: any, i: number) => (
                            <tr key={i} className="border-b text-sm">
                              <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                              <td>{log.direction || ''}</td>
                              <td>{log.mode || ''}</td>
                              <td>
                                {log.success === true ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600">Failure</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <select
                          value={pageSize}
                          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                          className="border rounded px-2 py-1"
                        >
                          {[10, 20, 50, 100].map(size => (
                            <option key={size} value={size}>{size} / page</option>
                          ))}
                        </select>
                      </div>
                      <ul className="flex space-x-2 justify-center">
                        <li
                          className={`flex items-center justify-center shrink-0 bg-gray-100 w-9 h-9 rounded-md cursor-pointer ${page === 1 ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() => page > 1 && setPage(page - 1)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 fill-gray-400" viewBox="0 0 55.753 55.753">
                            <path d="M12.745 23.915c.283-.282.59-.52.913-.727L35.266 1.581a5.4 5.4 0 0 1 7.637 7.638L24.294 27.828l18.705 18.706a5.4 5.4 0 0 1-7.636 7.637L13.658 32.464a5.367 5.367 0 0 1-.913-.727 5.367 5.367 0 0 1-1.572-3.911 5.369 5.369 0 0 1 1.572-3.911z" />
                          </svg>
                        </li>
                        {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => (
                          <li
                            key={i}
                            className={`flex items-center justify-center shrink-0 border ${page === i + 1 ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 text-spate-900'} hover:border-blue-500 cursor-pointer text-base font-medium px-[13px] h-9 rounded-md`}
                            onClick={() => setPage(i + 1)}
                          >
                            {i + 1}
                          </li>
                        ))}
                        <li
                          className={`flex items-center justify-center shrink-0 border border-gray-200 hover:border-blue-500 cursor-pointer w-9 h-9 rounded-md ${page === Math.ceil(total / pageSize) ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() => page < Math.ceil(total / pageSize) && setPage(page + 1)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 fill-gray-400 rotate-180" viewBox="0 0 55.753 55.753">
                            <path d="M12.745 23.915c.283-.282.59-.52.913-.727L35.266 1.581a5.4 5.4 0 0 1 7.637 7.638L24.294 27.828l18.705 18.706a5.4 5.4 0 0 1-7.636 7.637L13.658 32.464a5.367 5.367 0 0 1-.913-.727 5.367 5.367 0 0 1-1.572-3.911 5.369 5.369 0 0 1 1.572-3.911z" />
                          </svg>
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div></div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleExportSettingChangeHistory}>Export CSV</Button>
                        <Button size="sm" variant="outline" onClick={handleExportSettingChangeHistoryExcel}>Export Excel</Button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-sm font-medium text-gray-500">
                            <th className="pb-2">Timestamp</th>
                            <th className="pb-2">Setting</th>
                            <th className="pb-2">Old Value</th>
                            <th className="pb-2">New Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deviceHistory.filter((log: any) => log.action === 'setting-change').length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-4 text-gray-400">No setting changes found.</td></tr>
                          ) : deviceHistory.filter((log: any) => log.action === 'setting-change').map((log: any, i: number) => (
                            <tr key={i} className="border-b text-sm">
                              <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                              <td>{log.settingType || ''}</td>
                              <td>{typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue) : String(log.oldValue)}</td>
                              <td>{typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : String(log.newValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls for Setting History */}
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <select
                        value={settingPageSize}
                        onChange={e => { setSettingPageSize(Number(e.target.value)); setSettingPage(1); }}
                        className="border rounded px-2 py-1"
                      >
                        {[10, 20, 50, 100].map(size => (
                          <option key={size} value={size}>{size} / page</option>
                        ))}
                      </select>
                    </div>
                    <ul className="flex space-x-2 justify-center">
                      <li
                        className={`flex items-center justify-center shrink-0 bg-gray-100 w-9 h-9 rounded-md cursor-pointer ${settingPage === 1 ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => settingPage > 1 && setSettingPage(settingPage - 1)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 fill-gray-400" viewBox="0 0 55.753 55.753">
                          <path d="M12.745 23.915c.283-.282.59-.52.913-.727L35.266 1.581a5.4 5.4 0 0 1 7.637 7.638L24.294 27.828l18.705 18.706a5.4 5.4 0 0 1-7.636 7.637L13.658 32.464a5.367 5.367 0 0 1-.913-.727 5.367 5.367 0 0 1-1.572-3.911 5.369 5.369 0 0 1 1.572-3.911z" />
                        </svg>
                      </li>
                      {Array.from({ length: Math.ceil(settingTotal / settingPageSize) }, (_, i) => (
                        <li
                          key={i}
                          className={`flex items-center justify-center shrink-0 border ${settingPage === i + 1 ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 text-spate-900'} hover:border-blue-500 cursor-pointer text-base font-medium px-[13px] h-9 rounded-md`}
                          onClick={() => setSettingPage(i + 1)}
                        >
                          {i + 1}
                        </li>
                      ))}
                      <li
                        className={`flex items-center justify-center shrink-0 border border-gray-200 hover:border-blue-500 cursor-pointer w-9 h-9 rounded-md ${settingPage === Math.ceil(settingTotal / settingPageSize) ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => settingPage < Math.ceil(settingTotal / settingPageSize) && setSettingPage(settingPage + 1)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 fill-gray-400 rotate-180" viewBox="0 0 55.753 55.753">
                          <path d="M12.745 23.915c.283-.282.59-.52.913-.727L35.266 1.581a5.4 5.4 0 0 1 7.637 7.638L24.294 27.828l18.705 18.706a5.4 5.4 0 0 1-7.636 7.637L13.658 32.464a5.367 5.367 0 0 1-.913-.727 5.367 5.367 0 0 1-1.572-3.911 5.369 5.369 0 0 1 1.572-3.911z" />
                        </svg>
                      </li>
                    </ul>
                  </div>
                </>
                )}
              </div>
              </TransformerErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
        <LogExportDialog
          isOpen={showTapChangeExport}
          onClose={() => setShowTapChangeExport(false)}
          logType="tap-change"
          transformerName={transformer.name}
          onExport={handleTapChangeExport}
        />
        <LogExportDialog
          isOpen={showEventExport}
          onClose={() => setShowEventExport(false)}
          logType="event"
          transformerName={transformer.name}
          onExport={handleEventExport}
        />
      </DialogContent>
    </Dialog>
  )
}

export default TransformerDetail;