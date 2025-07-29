"use client"

import { Activity, AlertTriangle, Check, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TransformerNameChip } from "@/components/transformer-name-chip"
import type { Transformer } from "@/types/transformer"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface TransformerCardProps {
  transformer: Transformer
  transformers: Transformer[]
  onClick: () => void
  onDelete?: (deviceId: string) => void
}

export function TransformerCard({ transformer, transformers, onClick, onDelete }: TransformerCardProps) {
  const [liveTransformer, setLiveTransformer] = useState<Transformer>(transformer);

  // Fallback for voltageBand using lowerVoltage and upperVoltage from Mongo
  const voltageBand = liveTransformer.voltageBand || {
    lower: typeof liveTransformer.lowerVoltage !== 'undefined' ? Number(liveTransformer.lowerVoltage) : 0,
    upper: typeof liveTransformer.upperVoltage !== 'undefined' ? Number(liveTransformer.upperVoltage) : 0,
  };

  const [latestVoltage, setLatestVoltage] = useState<number | null>(null);
  const [voltageTime, setVoltageTime] = useState<string | null>(null);
  const [loadingVoltage, setLoadingVoltage] = useState<boolean>(true);
  const [voltageError, setVoltageError] = useState<boolean>(false);

  const [latestTapPosition, setLatestTapPosition] = useState<number | null>(null);
  const [tapPositionTime, setTapPositionTime] = useState<string | null>(null);
  const [loadingTapPosition, setLoadingTapPosition] = useState<boolean>(true);
  const [tapPositionError, setTapPositionError] = useState<string | null>(null);

  const [latestCurrent, setLatestCurrent] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState<boolean>(true);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch voltage (D150) and current (D151) in the same flow
  useEffect(() => {
    let isMounted = true;
    setLoadingVoltage(true);
    setLoadingCurrent(true);
    setVoltageError(false);
    setTapPositionError(null);
    setVoltageTime(null);
    setCurrentTime(null);

    // Fetch voltage (D150)
    fetch(`/avr/api/transformers/latest-voltage?deviceId=${encodeURIComponent(liveTransformer.deviceId || liveTransformer.id)}&sensorId=D150`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (typeof data.voltage === 'number') {
            setLatestVoltage(data.voltage);
            setVoltageTime(data.time || null);
            setVoltageError(false);
          } else {
            setLatestVoltage(null);
            setVoltageTime(null);
            setVoltageError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLatestVoltage(null);
          setVoltageTime(null);
          setVoltageError(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingVoltage(false);
      });

    // Fetch current (D151) from the new /latest-current route
    fetch(`/avr/api/transformers/latest-current?deviceId=${encodeURIComponent(liveTransformer.deviceId || liveTransformer.id)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (typeof data.current === 'number') {
            setLatestCurrent(data.current);
            setCurrentTime(data.time || null);
          } else {
            setLatestCurrent(null);
            setCurrentTime(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLatestCurrent(null);
          setCurrentTime(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCurrent(false);
      });

    // Fetch tap position (D108)
    fetch(`/avr/api/transformers/latest-tap-position?deviceId=${encodeURIComponent(liveTransformer.deviceId || liveTransformer.id)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (typeof data.tapPosition === 'number') {
            setLatestTapPosition(data.tapPosition);
            setTapPositionTime(data.time || null);
            setTapPositionError(null);
          } else {
            setLatestTapPosition(null);
            setTapPositionTime(null);
            setTapPositionError(data.error || 'No tap position data');
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLatestTapPosition(null);
          setTapPositionTime(null);
          setTapPositionError('Error fetching tap position');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingTapPosition(false);
      });

    // Fetch latest transformer from backend
    const fetchLatest = async () => {
      try {
        const res = await fetch('/avr/api/transformers/list');
        const data = await res.json();
        if (Array.isArray(data.transformers)) {
          const updated = data.transformers.find((t: any) => t.deviceId === (liveTransformer.deviceId || liveTransformer.id));
          if (updated && isMounted) setLiveTransformer(updated);
        }
      } catch {}
    };
    fetchLatest();
    return () => { isMounted = false; };
  }, [liveTransformer.deviceId, liveTransformer.id]);

  // Update: Compare (latestVoltage * 100) to voltageBand
  const isInBand =
    typeof latestVoltage === 'number' && (latestVoltage * 100) >= voltageBand.lower && (latestVoltage * 100) <= voltageBand.upper;

  // Fallback for interlocks
  const interlocks = liveTransformer.interlocks || {
    tapChangerInProgress: false,
    tapChangerStuck: false,
    motorFault: false,
    manualLock: false,
    tcInRemote: true,
    tcControlSupplyFail: false,
    overCurrent: false,
  };
  // Only consider the keys defined in the Interlocks type
  const allowedInterlockKeys = [
    "tapChangerInProgress",
    "tapChangerStuck",
    "overCurrent",
    "voltageError",
  ];
  const hasActiveInterlock = Object.entries(interlocks)
    .filter(([key]) => allowedInterlockKeys.includes(key))
    .some(([, value]) => value);

  // Compute live error conditions
  const currentError =
    typeof latestCurrent === 'number' &&
    (
      (liveTransformer.currentRating?.ratedCurrent !== undefined && latestCurrent > liveTransformer.currentRating.ratedCurrent) ||
      (liveTransformer.currentRating?.overCurrentLimit !== undefined && latestCurrent > liveTransformer.currentRating.overCurrentLimit)
    );

  const status =
    voltageError || currentError
      ? "error"
      : hasActiveInterlock
        ? "warning"
        : "normal";

  const mode = liveTransformer.mode || 'manual';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/avr/api/transformers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: transformer.deviceId || transformer.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete device");
      setShowDeleteDialog(false);
      if (onDelete) onDelete(transformer.deviceId || transformer.id);
    } catch (err) {
      // Optionally show error toast
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const isBandNotSet = voltageBand.lower === 0 && voltageBand.upper === 0;

  return (
    <>
    <Card className="cursor-pointer transition-all hover:shadow-md w-full" onClick={onClick}>
      <CardHeader className="pb-2">
          <div className="flex flex-row items-center gap-2 sm:justify-between">
          <TransformerNameChip name={liveTransformer.deviceName || liveTransformer.name} type={liveTransformer.type} maxLength={15} className="flex-1" />
            <div className="flex items-center gap-2">
            <Badge
              variant={
                status === "normal"
                  ? "success"
                  : status === "warning"
                    ? "warning"
                    : "destructive"
              }
              className="flex items-center gap-1 flex-shrink-0"
            >
              {status === "normal" && <CheckCircle className="h-3 w-3" />}
              {status === "warning" && <AlertTriangle className="h-3 w-3" />}
              {status === "error" && <XCircle className="h-3 w-3" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
              <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete Transformer">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-medium">{liveTransformer.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Mode</p>
            <p className="font-medium">
              {liveTransformer.masterFollower
                ? liveTransformer.masterFollower.isMaster
                  ? "Master"
                  : "Follower"
                : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </p>
            {liveTransformer.masterFollower?.isFollower && (
              <p className="text-xs text-gray-400">
                Following: {transformers.find((t) => t.id === liveTransformer.masterFollower?.masterId)?.name || "Unknown"}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Tap Position</p>
            <div className="flex items-center gap-1">
              {loadingTapPosition ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : tapPositionError ? (
                <span className="text-red-500 text-sm">{tapPositionError}</span>
              ) : (
                <p className="font-medium">{typeof latestTapPosition === 'number' ? latestTapPosition.toFixed(2) : ''}</p>
              )}
            </div>
            {tapPositionTime && (
              <p className="text-xs text-gray-400">{new Date(tapPositionTime).toLocaleString()}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Voltage</p>
            <div className="flex items-center gap-1">
              {loadingVoltage ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : voltageError ? (
                <span className="text-red-500 text-sm">Error</span>
              ) : (
                <span className={
                  !isInBand ? "font-medium text-red-500 flex items-center gap-1" : "font-medium"
                }>
                  {typeof latestVoltage === 'number' ? latestVoltage.toFixed(2) : ''} V
                  {!isInBand && (
                    <span title={`Voltage (${typeof latestVoltage === 'number' ? (latestVoltage * 100).toFixed(0) : ''}) is out of band (${voltageBand.lower} - ${voltageBand.upper})`}>
                      <AlertTriangle className="h-4 w-4 text-red-500 ml-1" />
                    </span>
                  )}
                </span>
              )}
            </div>
            {voltageTime && (
              <p className="text-xs text-gray-400">{new Date(voltageTime).toLocaleString()}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Band</p>
            <p className="font-medium">
                {(voltageBand.lower === 0 && voltageBand.upper === 0)
                  ? "Not set"
                  : `${voltageBand.lower} - ${voltageBand.upper} V`}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">Last tap change: -</span>
          </div>
          <div className="flex items-center gap-1">
              {isBandNotSet ? (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : hasActiveInterlock ? (
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            ) : (
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
              <span className="text-sm text-gray-600">
                {isBandNotSet
                  ? "Not ready"
                  : hasActiveInterlock
                    ? "Interlock active"
                    : "Ready"}
              </span>
          </div>
        </div>
      </CardFooter>
    </Card>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transformer</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete <b>{liveTransformer.deviceName || liveTransformer.name}</b>? This action cannot be undone.</div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
