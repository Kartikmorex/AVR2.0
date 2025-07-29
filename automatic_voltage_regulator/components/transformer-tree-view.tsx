"use client"

import { ChevronDown, ChevronRight, Crown, Users, CheckCircle, AlertTriangle, XCircle, User } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Transformer } from "@/types/transformer"
import { Badge } from "@/components/ui/badge"

interface TransformerTreeViewProps {
  transformers: Transformer[]
  onTransformerSelect: (transformerId: string) => void
}

export function TransformerTreeView({ transformers, onTransformerSelect }: TransformerTreeViewProps) {
  const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set())

  const toggleMaster = (masterId: string) => {
    const newExpanded = new Set(expandedMasters)
    if (newExpanded.has(masterId)) {
      newExpanded.delete(masterId)
    } else {
      newExpanded.add(masterId)
    }
    setExpandedMasters(newExpanded)
  }

  const masters = transformers.filter((t) => t.masterFollower?.isMaster)
  const standalones = transformers.filter((t) => !t.masterFollower)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
    switch (status) {
      case "normal":
        return `${baseClasses} bg-green-100 text-green-800`
      case "warning":
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case "error":
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b hidden md:block">
        <div className="grid grid-cols-12 gap-2 lg:gap-4 p-4 font-medium text-sm text-gray-700">
          <div className="col-span-3">Name</div>
          <div className="col-span-1 text-center">Type</div>
          <div className="col-span-1 text-center">Mode</div>
          <div className="col-span-1 text-center">Voltage</div>
          <div className="col-span-1 text-center">Tap Pos</div>
          <div className="col-span-1 text-center">Range</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-1 text-center">Role</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>
      </div>

      <div className="divide-y">
        {/* Master-Follower Groups */}
        {masters.map((master) => {
          const followers = transformers.filter((t) => t.masterFollower?.masterId === master.id)
          const isExpanded = expandedMasters.has(master.id)

          return (
            <div key={master.id}>
              {/* Master Row */}
              <div className="hover:bg-gray-50 transition-colors">
                {/* Desktop Layout */}
                <div className="hidden md:grid grid-cols-12 gap-2 lg:gap-4 p-4 items-center">
                  <div className="col-span-3 flex items-center gap-2">
                    <button
                      onClick={() => toggleMaster(master.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <span className="font-medium truncate" title={master.name}>
                      {master.name.length > 25 ? `${master.name.substring(0, 25)}...` : master.name}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 border-yellow-200"
                    >
                      <Crown className="h-3 w-3" />
                      Master
                    </Badge>
                  </div>
                  <div className="col-span-1 text-center text-sm">
                    {master.mode.charAt(0).toUpperCase() + master.mode.slice(1)}
                  </div>
                  <div className="col-span-1 text-center text-sm font-medium">{master.voltage} V</div>
                  <div className="col-span-1 text-center text-sm font-medium">{master.tapPosition}</div>
                  <div className="col-span-1 text-center text-sm">
                    {master.tapLimits.min}-{master.tapLimits.max}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={getStatusBadge(master.status)}>
                      {getStatusIcon(master.status)}
                      {master.status.charAt(0).toUpperCase() + master.status.slice(1)}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-1 text-yellow-600">
                    <Crown className="h-4 w-4" />
                    <span className="text-xs font-medium">Master</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => onTransformerSelect(master.id)}>
                      Details
                    </Button>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMaster(master.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <span className="font-medium truncate" title={master.name}>
                        {master.name.length > 20 ? `${master.name.substring(0, 20)}...` : master.name}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onTransformerSelect(master.id)}>
                      Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200">
                        <Crown className="h-3 w-3 mr-1" />
                        Master
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Mode:</span>
                      <span className="ml-2">{master.mode.charAt(0).toUpperCase() + master.mode.slice(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Voltage:</span>
                      <span className="ml-2 font-medium">{master.voltage} V</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tap:</span>
                      <span className="ml-2 font-medium">{master.tapPosition}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={getStatusBadge(master.status)}>
                      {getStatusIcon(master.status)}
                      {master.status.charAt(0).toUpperCase() + master.status.slice(1)}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Crown className="h-4 w-4" />
                      <span className="text-xs font-medium">Master</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follower Rows */}
              {isExpanded &&
                followers.map((follower) => (
                  <div key={follower.id} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                    <div className="grid grid-cols-12 gap-4 p-4 pl-12 items-center">
                      <div className="col-span-3 flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        </div>
                        <span className="font-medium truncate" title={follower.name}>
                          {follower.name.length > 23 ? `${follower.name.substring(0, 23)}...` : follower.name}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-800 border-blue-200"
                        >
                          <Users className="h-3 w-3" />
                          Follower
                        </Badge>
                      </div>
                      <div className="col-span-1 text-center text-sm text-blue-700">Follower</div>
                      <div className="col-span-1 text-center text-sm font-medium">{follower.voltage} V</div>
                      <div className="col-span-1 text-center text-sm font-medium">{follower.tapPosition}</div>
                      <div className="col-span-1 text-center text-sm">
                        {follower.tapLimits.min}-{follower.tapLimits.max}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className={getStatusBadge(follower.status)}>
                          {getStatusIcon(follower.status)}
                          {follower.status.charAt(0).toUpperCase() + follower.status.slice(1)}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center gap-1 text-blue-600">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-medium">Follower</span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button variant="outline" size="sm" onClick={() => onTransformerSelect(follower.id)}>
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )
        })}

        {/* Standalone Transformers */}
        {standalones.map((transformer) => (
          <div key={transformer.id} className="hover:bg-gray-50 transition-colors">
            <div className="grid grid-cols-12 gap-4 p-4 items-center">
              <div className="col-span-3 flex items-center gap-2">
                <div className="w-6 h-4"></div>
                <span className="font-medium truncate" title={transformer.name}>
                  {transformer.name.length > 25 ? `${transformer.name.substring(0, 25)}...` : transformer.name}
                </span>
              </div>
              <div className="col-span-1 flex justify-center">
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-800 border-gray-200"
                >
                  <User className="h-3 w-3" />
                  Individual
                </Badge>
              </div>
              <div className="col-span-1 text-center text-sm">
                {transformer.mode.charAt(0).toUpperCase() + transformer.mode.slice(1)}
              </div>
              <div className="col-span-1 text-center text-sm font-medium">{transformer.voltage} V</div>
              <div className="col-span-1 text-center text-sm font-medium">{transformer.tapPosition}</div>
              <div className="col-span-1 text-center text-sm">
                {transformer.tapLimits.min}-{transformer.tapLimits.max}
              </div>
              <div className="col-span-2 flex justify-center">
                <span className={getStatusBadge(transformer.status)}>
                  {getStatusIcon(transformer.status)}
                  {transformer.status.charAt(0).toUpperCase() + transformer.status.slice(1)}
                </span>
              </div>
              <div className="col-span-1 flex justify-center">
                <span className="text-xs text-gray-500 font-medium">Standalone</span>
              </div>
              <div className="col-span-1 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => onTransformerSelect(transformer.id)}>
                  Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
