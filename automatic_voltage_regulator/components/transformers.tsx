"use client"

import { useState, useEffect } from "react"
import { TransformerCard } from "@/components/transformer-card"
import { TransformerDetail } from "@/components/transformer-detail"
import { MasterFollowerConfig } from "@/components/master-follower-config"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Save, AlertTriangle, Plus, Settings, ChevronDown, ChevronRight, LayoutGrid, List as ListIcon, X as XIcon } from "lucide-react"
import { AddTransformerModal } from "@/components/add-transformer-modal"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useTransformers } from "@/hooks/use-transformers"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { useLiveTransformerData } from "@/hooks/useLiveTransformerData"
import TransformersListView from "@/components/transformers-list-view"

export function Transformers() {
  // --- SYNC LOGIC (commented out for future use) ---
  // const [loading, setLoading] = useState(false)
  // const [syncing, setSyncing] = useState(false)
  // const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  // 
  // // Fetch transformers from DB
  // const fetchTransformers = async () => {
  //   setLoading(true)
  //   try {
  //     const res = await fetch('/avr/api/transformers/list')
  //     const data = await res.json()
  //     if (data.success) {
  //       setTransformers(data.transformers)
  //     } else {
  //       toast({ title: 'Error', description: data.error, variant: 'destructive' })
  //     }
  //   } catch (err) {
  //     toast({ title: 'Error', description: 'Failed to fetch transformers.', variant: 'destructive' })
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  // 
  // useEffect(() => {
  //   fetchTransformers()
  // }, [])
  // 
  // const handleSyncAll = async () => {
  //   setShowSyncConfirm(false)
  //   setSyncing(true)
  //   toast({ title: 'Syncing...', description: 'Syncing device metadata with IoSense.', duration: 2000 })
  //   try {
  //     const res = await fetch('/avr/api/transformers/sync-metadata', { method: 'POST' })
  //     const data = await res.json()
  //     if (data.success) {
  //       toast({
  //         title: 'Sync Complete',
  //         description: `Synced metadata for ${data.synced} device(s).${data.failed.length ? ' Some failed: ' + data.failed.join(', ') : ''}`,
  //         duration: 4000,
  //       })
  //     } else {
  //       toast({ title: 'Sync Failed', description: data.error || 'Failed to sync device metadata.', variant: 'destructive', duration: 4000 })
  //     }
  //   } catch (err) {
  //     toast({ title: 'Sync Failed', description: 'Failed to sync device metadata.', variant: 'destructive', duration: 4000 })
  //   } finally {
  //     setSyncing(false)
  //   }
  // }

  const {
    transformers,
    addTransformer,
    updateMasterFollower,
    updateTransformerMode,
    updateTapPosition,
    modeChangeLoading,
    tapChangeLoading,
    commandDelay,
    updateCommandDelay,
    getRemainingCooldown,
    refreshTransformers,
  } = useTransformers();
  const [showAddTransformerModal, setShowAddTransformerModal] = useState(false);
  const { toast } = useToast();
  // --- MASTER FOLLOWER LOGIC ---
  const [showMasterFollowerConfig, setShowMasterFollowerConfig] = useState(false);
  const [selectedTransformerId, setSelectedTransformerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set());
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ masterId: string; followerId: string } | null>(null);

  // Helper functions for new master-follower logic
  const masters = transformers.filter(t => t.type === 'Master');
  const followers = transformers.filter(t => t.type === 'Follower');
  const individuals = transformers.filter(t => t.type === 'Individual');
  const getFollowers = (masterId: string) => followers.filter(f => f.masterName === masterId);

  const handleAddTransformers = async (devices: any[]) => {
    // 1. Add to backend/account
    const deviceDocs = devices.map((d) => ({
      deviceId: d.devID || d.id,
      deviceName: d.devName || d.name || d.devID || d.id,
    }));
    let success = false;
    try {
      const response = await fetch('/avr/api/transformers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: deviceDocs }),
      });
      success = response.ok;
      if (success) {
        await refreshTransformers();
      }
    } catch (e) {
      success = false;
    }

      toast({
      title: success ? 'Transformers Added' : 'Transformers Added (local only)',
      description: `Successfully added ${devices.length} transformer${devices.length !== 1 ? 's' : ''} to your account${success ? '' : ' (mock only)'}.`,
        duration: 3000,
    });
  };

  const handleSaveMasterFollower = (masterId: string, followerIds: string[]) => {
    updateMasterFollower(masterId, followerIds);
    setShowMasterFollowerConfig(false);
      toast({
      title: 'Master-Follower Configured',
      description: `Master and follower relationships updated successfully.`,
        duration: 3000,
    });
  };

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

  // Helper function to handle removing a follower and updating all affected devices
  async function removeFollowerAndUpdate(masterId: string, removedFollowerId: string, transformers: any[]) {
    // Find all followers of the master (before removal)
    const followers = transformers.filter(t => t.type === 'Follower' && t.masterName === masterId).map(t => t.deviceId);
    // Remove the follower
    const remainingFollowers = followers.filter(fid => fid !== removedFollowerId);
    const updates = [];
    // 1. Removed follower
    updates.push({
      deviceId: removedFollowerId,
      type: 'Individual',
      masterName: '-',
    });
    // 2. Master
    if (remainingFollowers.length === 0) {
      // No followers left, master becomes Individual
      updates.push({
        deviceId: masterId,
        type: 'Individual',
        masterName: '-',
      });
    } else {
      // Still has followers, stays Master
      updates.push({
        deviceId: masterId,
        type: 'Master',
        masterName: '-',
      });
      // 3. Remaining followers
      for (const fid of remainingFollowers) {
        updates.push({
          deviceId: fid,
          type: 'Follower',
          masterName: masterId,
        });
      }
    }
    // Send to backend
    await fetch('/avr/api/transformers/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
  }

  // Remove follower from master-follower mapping
  const handleRemoveFollower = async (masterId: string, followerId: string) => {
    try {
      await removeFollowerAndUpdate(masterId, followerId, transformers);
      await refreshTransformers();
      toast({ title: "Follower removed", description: "The follower was removed successfully.", duration: 3000 });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to remove follower.", variant: "destructive", duration: 3000 });
    }
  };

  const confirmRemoveFollower = () => {
    if (pendingRemove) {
      handleRemoveFollower(pendingRemove.masterId, pendingRemove.followerId);
      setRemoveDialogOpen(false);
      setPendingRemove(null);
    }
  };

  function TransformerRow({ transformer, onView }: { transformer: any, onView: (id: string) => void }) {
    const { latestTapPosition, latestVoltage, loading, voltageError, voltageTime } = useLiveTransformerData(transformer.deviceId);
    return (
      <TableRow key={transformer.deviceId}>
        <TableCell></TableCell>
        <TableCell>
          {transformer.deviceName || transformer.name}
          <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded ${transformer.type === 'Master' ? 'text-yellow-700 bg-yellow-100' : transformer.type === 'Follower' ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}>{transformer.type}</span>
        </TableCell>
        <TableCell>{transformer.type}</TableCell>
        <TableCell>{transformer.mode}</TableCell>
        <TableCell>{transformer.status}</TableCell>
        <TableCell>{typeof latestTapPosition === 'number' ? latestTapPosition : 'N/A'}</TableCell>
        <TableCell>
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
        <TableCell>
          <Button size="sm" variant="outline" onClick={() => onView(transformer.deviceId)}>
            View
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Transformer Management</h2>
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="default"
            className="flex items-center h-10 px-4 rounded-md"
            onClick={() => setShowAddTransformerModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Transformers
          </Button>
            <Button
            variant="default"
            className="flex items-center h-10 px-4 rounded-md"
            onClick={() => setShowMasterFollowerConfig(true)}
          >
            <Settings className="w-4 h-4 mr-2" /> Configure Master Follower
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <button
              className={`flex items-center justify-center h-10 w-10 rounded-md border ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-700'} transition`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              type="button"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              className={`flex items-center justify-center h-10 w-10 rounded-md border ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-700'} transition`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              type="button"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sync All Confirmation Dialog (commented out) */}
      {/*
      {showSyncConfirm && (
        <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-2">Sync All Device Metadata?</h3>
              <p className="mb-4 text-gray-700">Are you sure you want to sync all device metadata with IoSense? This will overwrite existing metadata for all devices.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSyncConfirm(false)}>Cancel</Button>
                <Button onClick={handleSyncAll} disabled={syncing} className="bg-blue-600 text-white">Sync All</Button>
          </div>
        </div>
          </div>
        </Dialog>
      )}
      */}

      {showMasterFollowerConfig && (
        <MasterFollowerConfig
          transformers={transformers}
          onClose={() => setShowMasterFollowerConfig(false)}
          onSave={handleSaveMasterFollower}
        />
      )}

      {/* Transformer Detail Dialog */}
      <Dialog open={!!selectedTransformerId} onOpenChange={() => setSelectedTransformerId(null)}>
        {selectedTransformerId && (() => {
          const selectedTransformer = transformers.find(t => t.deviceId === selectedTransformerId);
          console.log('selectedTransformer:', selectedTransformer);
          if (!selectedTransformer) {
            // Pass a dummy function for refreshTransformers to satisfy the prop requirement
            return <div className="p-6 text-red-500">Transformer not found or data missing.</div>;
          }
          return (
            <TransformerDetail
              transformer={selectedTransformer}
              onClose={() => setSelectedTransformerId(null)}
              transformers={transformers}
              onModeChange={updateTransformerMode}
              onTapChange={updateTapPosition}
              modeChangeLoading={modeChangeLoading instanceof Set ? modeChangeLoading : new Set()}
              tapChangeLoading={tapChangeLoading instanceof Set ? tapChangeLoading : new Set()}
              commandDelay={commandDelay}
              onCommandDelayChange={updateCommandDelay}
              getRemainingCooldown={getRemainingCooldown}
              refreshTransformers={refreshTransformers} // <-- pass down
            />
          );
        })()}
      </Dialog>

      {transformers.length === 0 ? (
        <div className="text-gray-500">No transformers found.</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {transformers.map((transformer) => (
            <TransformerCard
              key={transformer._id ? transformer._id.toString() : transformer.deviceId}
              transformer={transformer}
              transformers={transformers}
              onClick={() => setSelectedTransformerId(transformer.deviceId ?? null)}
            />
          ))}
        </div>
      ) : (
        <TransformersListView
          masters={masters}
          masterFollowers={followers}
          individuals={individuals}
          setSelectedTransformerId={setSelectedTransformerId}
          onRemoveFollower={handleRemoveFollower}
        />
      )}

      {showAddTransformerModal && (
        <AddTransformerModal
          isOpen={showAddTransformerModal}
          onClose={() => setShowAddTransformerModal(false)}
          onAddTransformers={handleAddTransformers}
          alreadyAddedDeviceIds={transformers.map(t => t.deviceId).filter((id): id is string => typeof id === 'string')}
        />
      )}

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogTitle>Remove Follower</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this follower from the master-follower pairing? This device will become an Individual.
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setRemoveDialogOpen(false)}>Cancel</button>
            <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={confirmRemoveFollower}>Remove</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
