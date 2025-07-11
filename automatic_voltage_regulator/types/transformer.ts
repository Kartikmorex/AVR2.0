export interface Interlocks {
  tapChangerInProgress: boolean
  tapChangerStuck: boolean
  overCurrent: boolean
  voltageError: boolean
}

export interface MasterFollower {
  isMaster: boolean
  isFollower: boolean
  masterId: string | null
  followerIds: string[] | null
}

export interface TapLimits {
  min: number
  max: number
}

export interface ToleranceBand {
  referenceVoltage: number // kV
  tolerancePercentage: number // 0.5% to 5%
  lowerLimit: number // calculated
  upperLimit: number // calculated
}

export interface CurrentRating {
  ratedCurrent: number // Amperes
  overCurrentLimit: number // Amperes (user selectable)
  currentValue: number // Current measured value
}

export type TransformerType = "Individual" | "Master" | "Follower"

export interface Transformer {
  _id?: string
  deviceId?: string
  deviceName?: string
  lowerVoltage?: number
  upperVoltage?: number
  id: string
  name: string
  mode: "auto" | "manual"
  status: "normal" | "warning" | "error"
  voltage: number
  tapPosition: number
  tapLimits: TapLimits
  tapLimitMin?: number
  tapLimitMax?: number
  voltageBand?: {
    lower: number
    upper: number
  }
  toleranceBand: ToleranceBand
  currentRating: CurrentRating
  voltageSource: "relay" | "mfm"
  interlocks: Interlocks
  masterFollower: MasterFollower | null
  type: TransformerType
  isLive: boolean // Reference or rated voltage is present
  voltageSignalValid: boolean // Voltage signal availability
  D46?: number
  D11?: number
  D151?: number
  D150?: number
  masterName?: string
  minDelay?: number
  threshold?: number
}
