"use client"

import { Crown, Users, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { TransformerType } from "@/types/transformer"

interface TransformerNameChipProps {
  name: string
  type: TransformerType
  maxLength?: number
  className?: string
}

export function TransformerNameChip({ name, type, maxLength = 20, className = "" }: TransformerNameChipProps) {
  const safeName = typeof name === 'string' && name.length > 0 ? name : 'Unknown';
  const truncatedName = safeName.length > maxLength ? `${safeName.substring(0, maxLength)}...` : safeName;
  const shouldTruncate = safeName.length > maxLength;

  const getTypeIcon = (type: TransformerType) => {
    switch (type) {
      case "Master":
        return <Crown className="h-3 w-3" />
      case "Follower":
        return <Users className="h-3 w-3" />
      case "Individual":
        return <User className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: TransformerType) => {
    switch (type) {
      case "Master":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Follower":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Individual":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-medium ${shouldTruncate ? "cursor-help" : ""}`} title={shouldTruncate ? safeName : undefined}>
        {truncatedName}
      </span>
      <Badge variant="outline" className={`flex items-center gap-1 text-xs px-2 py-1 ${getTypeColor(type)}`}>
        {getTypeIcon(type)}
        {type}
      </Badge>
    </div>
  )
}
