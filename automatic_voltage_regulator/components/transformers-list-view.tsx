import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLiveTransformerData } from "@/hooks/useLiveTransformerData";
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";

function TransformerRow({ transformer, onView, isFollower, onRemoveFollower, masterId }: {
  transformer: any,
  onView: (id: string) => void,
  isFollower?: boolean,
  onRemoveFollower?: (masterId: string, followerId: string) => void,
  masterId?: string,
}) {
  const { latestTapPosition, latestVoltage, loading, voltageError, voltageTime, latestCurrent, currentError } = useLiveTransformerData(transformer.deviceId, transformer);
  // Card status logic
  const interlocks = transformer.interlocks || {
    tapChangerInProgress: false,
    tapChangerStuck: false,
    motorFault: false,
    manualLock: false,
    tcInRemote: true,
    tcControlSupplyFail: false,
    overCurrent: false,
  };
  const allowedInterlockKeys = [
    "tapChangerInProgress",
    "tapChangerStuck",
    "overCurrent",
    "voltageError",
  ];
  const hasActiveInterlock = Object.entries(interlocks)
    .filter(([key]) => allowedInterlockKeys.includes(key))
    .some(([, value]) => value);
  const status =
    voltageError || currentError
      ? "error"
      : hasActiveInterlock
        ? "warning"
        : "normal";
  const statusDisplay = status === "error"
    ? <span className="text-red-600 flex items-center gap-1"><XCircle className="inline w-4 h-4" /> Error</span>
    : status === "warning"
      ? <span className="text-yellow-600 flex items-center gap-1"><AlertTriangle className="inline w-4 h-4" /> Warning</span>
      : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="inline w-4 h-4" /> Normal</span>;
  // Remove type badge after device name, move badge to type column
  const typeBadge = (
    <span className={`ml-0 text-xs font-semibold px-2 py-0.5 rounded ${transformer.type === 'Master' ? 'text-yellow-700 bg-yellow-100' : transformer.type === 'Follower' ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}>{transformer.type}</span>
  );
  return (
    <TableRow key={transformer.deviceId} className={isFollower ? "bg-blue-50" : ""}>
      <TableCell className={`text-center ${isFollower ? "pl-8" : ""}`}>{transformer.deviceName || transformer.name}
      </TableCell>
      <TableCell className="text-center">{typeBadge}</TableCell>
      <TableCell className="text-center">{transformer.mode}</TableCell>
      <TableCell className="text-center">{statusDisplay}</TableCell>
      <TableCell className="text-center">{typeof latestTapPosition === 'number' ? latestTapPosition.toFixed(2) : 'N/A'}</TableCell>
      <TableCell className="text-center">
        {loading ? (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full align-middle"></span>
        ) : voltageError ? (
          <span className="text-red-500 text-sm">Error</span>
        ) : (
          <span className="font-medium">{typeof latestVoltage === 'number' ? latestVoltage.toFixed(2) : 'N/A'}</span>
        )}
        {voltageTime && !loading && !voltageError && (
          <p className="text-xs text-gray-400">{new Date(voltageTime).toLocaleString()}</p>
        )}
      </TableCell>
      <TableCell className="text-center flex gap-2 justify-center items-center">
        <Button size="sm" variant="outline" onClick={() => onView(transformer.deviceId)}>
          View
        </Button>
        {isFollower && onRemoveFollower && masterId && (
          <Button size="sm" variant="destructive" onClick={() => onRemoveFollower(masterId, transformer.deviceId)}>
            Remove Follower
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function TransformersListView({ masters, masterFollowers, individuals, setSelectedTransformerId, onRemoveFollower }: {
  masters: any[],
  masterFollowers: any[],
  individuals: any[],
  setSelectedTransformerId: (id: string) => void,
  onRemoveFollower: (masterId: string, followerId: string) => void,
}) {
  const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set());
  const getFollowers = (masterId: string) => masterFollowers.filter(f => f.masterName === masterId);

  const toggleMaster = (masterId: string) => {
    setExpandedMasters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(masterId)) {
        newSet.delete(masterId);
      } else {
        newSet.add(masterId);
      }
      return newSet;
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">Name</TableHead>
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-center">Mode</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="text-center">Tap Position</TableHead>
          <TableHead className="text-center">Voltage</TableHead>
          <TableHead className="text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {masters.map(master => {
          const followers = getFollowers(master.deviceId);
          const isExpanded = expandedMasters.has(master.deviceId);
          // Remove type badge after master name, move badge to type column
          const typeBadge = (
            <span className="ml-0 text-xs font-semibold px-2 py-0.5 rounded text-yellow-700 bg-yellow-100">Master</span>
          );
          return (
            <React.Fragment key={master.deviceId}>
              <TableRow className="bg-yellow-50">
                <TableCell className="text-center cursor-pointer" onClick={() => toggleMaster(master.deviceId)}>
                  <span className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="inline w-4 h-4" /> : <ChevronRight className="inline w-4 h-4" />}
                    {master.deviceName || master.name}
                  </span>
                </TableCell>
                <TableCell className="text-center">{typeBadge}</TableCell>
                <TableCell className="text-center">{master.mode}</TableCell>
                <TableCell className="text-center">{/* Status logic can be added here if needed */}</TableCell>
                <TableCell className="text-center">{/* Tap Position */}</TableCell>
                <TableCell className="text-center">{/* Voltage */}</TableCell>
                <TableCell className="text-center">{/* Actions */}</TableCell>
              </TableRow>
              {isExpanded && followers.map(follower => (
                <TransformerRow
                  key={follower.deviceId}
                  transformer={follower}
                  onView={setSelectedTransformerId}
                  isFollower
                  onRemoveFollower={onRemoveFollower}
                  masterId={master.deviceId}
                />
              ))}
            </React.Fragment>
          );
        })}
        {individuals.map(individual => (
          <TransformerRow key={individual.deviceId} transformer={individual} onView={setSelectedTransformerId} />
        ))}
      </TableBody>
    </Table>
  );
} 