"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MqttConnectionState } from "@/types/mqtt"
import { cn } from "@/lib/utils"

const stateConfig: Record<
  MqttConnectionState,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  connected: { label: "Connected", variant: "default" },
  connecting: { label: "Connecting", variant: "secondary" },
  disconnected: { label: "Disconnected", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
}

type ConnectionStatusProps = {
  state: MqttConnectionState
  lastError?: string | null
  className?: string
  compact?: boolean
}

export function ConnectionStatus({
  state,
  lastError,
  className,
  compact = false,
}: ConnectionStatusProps) {
  const cfg = stateConfig[state]

  const badge = (
    <Badge variant={cfg.variant} className={cn("gap-1.5", className)}>
      {state === "connecting" && <Spinner className="size-3" />}
      {cfg.label}
    </Badge>
  )

  if (compact) {
    return lastError ? (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{lastError}</TooltipContent>
      </Tooltip>
    ) : (
      badge
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {badge}
      {state === "connecting" && <Progress value={66} className="h-1" />}
      {lastError && state === "error" && (
        <p className="text-xs text-destructive">{lastError}</p>
      )}
    </div>
  )
}
