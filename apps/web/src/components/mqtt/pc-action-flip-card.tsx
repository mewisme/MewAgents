"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  FlipHorizontal2Icon,
  PowerIcon,
  PowerOffIcon,
  TimerIcon,
  XIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { isValidMac } from "@/lib/mac"
import {
  shutdownCancelTopic,
  shutdownConfirmTopic,
  shutdownTopic,
  wakeupTopic,
} from "@/lib/topics"
import {
  MacSelectorControlled,
  useMacFromSelector,
} from "@/components/mqtt/mac-selector"

type PcActionSide = "wake" | "shutdown"

const SHUTDOWN_TTL_MS = 60_000

type PcActionFlipCardProps = {
  isConnected: boolean
  recentMacs: string[]
  selectedMac: string
  onSelectedMacChange: (mac: string) => void
  onWake: (mac: string) => void
  onShutdownRequest: (mac: string) => void
  onShutdownConfirm: (mac: string) => void
  onShutdownCancel: (mac: string) => void
}

export function PcActionFlipCard({
  isConnected,
  recentMacs,
  selectedMac,
  onSelectedMacChange,
  onWake,
  onShutdownRequest,
  onShutdownConfirm,
  onShutdownCancel,
}: PcActionFlipCardProps) {
  const [side, setSide] = useState<PcActionSide>("wake")
  const [inputMode, setInputMode] = useState<"text" | "otp">("text")
  const [otpValue, setOtpValue] = useState("")
  const [shutdownPending, setShutdownPending] = useState<{
    mac: string
    expiresAt: number
  } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const effectiveMac = useMacFromSelector(inputMode, selectedMac, otpValue)
  const valid = isValidMac(effectiveMac)
  const mac = valid ? effectiveMac.trim() : ""
  const wakeTopicPreview = valid ? wakeupTopic(mac) : "wakeup/…"
  const shutdownRequestPreview = valid ? shutdownTopic(mac) : "shutdown/…"
  const shutdownConfirmPreview = valid
    ? shutdownConfirmTopic(mac)
    : "shutdown/…/confirm"
  const shutdownCancelPreview = valid
    ? shutdownCancelTopic(mac)
    : "shutdown/…/cancel"

  const flip = () => setSide((s) => (s === "wake" ? "shutdown" : "wake"))

  const shutdownAwaitingConfirm =
    shutdownPending !== null &&
    shutdownPending.mac === mac &&
    now < shutdownPending.expiresAt

  const shutdownSecondsLeft = shutdownAwaitingConfirm
    ? Math.max(0, Math.ceil((shutdownPending.expiresAt - now) / 1000))
    : 0

  useEffect(() => {
    if (!shutdownPending) return

    const expiresAt = shutdownPending.expiresAt
    const remaining = Math.max(0, expiresAt - Date.now())

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    const timeout = setTimeout(() => {
      setShutdownPending(null)
      setNow(Date.now())
    }, remaining)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [shutdownPending])

  const ensureConnected = () => {
    if (!isConnected) {
      toast.error("Connect to the broker first")
      return false
    }
    if (!valid) {
      toast.error("Enter a valid MAC address")
      return false
    }
    return true
  }

  const handleWake = () => {
    if (!ensureConnected()) return
    onWake(mac)
  }

  const handleShutdownStep = () => {
    if (!ensureConnected()) return
    if (shutdownAwaitingConfirm) {
      onShutdownConfirm(mac)
      setShutdownPending(null)
      return
    }
    onShutdownRequest(mac)
    const expiresAt = Date.now() + SHUTDOWN_TTL_MS
    setNow(Date.now())
    setShutdownPending({ mac, expiresAt })
  }

  const handleShutdownCancel = () => {
    if (!ensureConnected()) return
    onShutdownCancel(mac)
    setShutdownPending(null)
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2">
            {side === "wake" ? (
              <>
                <PowerIcon className="size-5 shrink-0" />
                Wake PC
              </>
            ) : (
              <>
                <PowerOffIcon className="size-5 shrink-0" />
                Shutdown PC
              </>
            )}
          </CardTitle>
          <CardDescription className="text-pretty">
            {side === "wake" ? (
              <>
                Publish to{" "}
                <code className="text-xs">{wakeTopicPreview}</code> (QoS 1)
              </>
            ) : shutdownAwaitingConfirm ? (
              <>
                Step 2 of 2 — confirm within{" "}
                <span className="tabular-nums">{shutdownSecondsLeft}s</span> on{" "}
                <code className="text-xs">{shutdownConfirmPreview}</code>
              </>
            ) : (
              <>
                Step 1 of 2 — publish to{" "}
                <code className="text-xs">{shutdownRequestPreview}</code>, then
                confirm on the same button
              </>
            )}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={flip}
          aria-label={side === "wake" ? "Show shutdown" : "Show wake"}
        >
          <FlipHorizontal2Icon className="size-4" />
          {side === "wake" ? "Shutdown" : "Wake"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <MacSelectorControlled
          recentMacs={recentMacs}
          selectedMac={selectedMac}
          onSelectedMacChange={onSelectedMacChange}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          otpValue={otpValue}
          onOtpValueChange={setOtpValue}
          datalistId="pc-action-macs"
        />

        <div className="[perspective:1000px]">
          <div
            className={cn(
              "relative grid transition-transform duration-500 [transform-style:preserve-3d]",
              side === "shutdown" && "[transform:rotateY(180deg)]"
            )}
          >
            <div
              className={cn(
                "col-start-1 row-start-1 [backface-visibility:hidden]",
                side === "shutdown" && "pointer-events-none opacity-0"
              )}
              aria-hidden={side === "shutdown"}
            >
              <ButtonGroup className="w-full sm:w-auto">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={!valid || !isConnected} className="w-full sm:w-auto">
                      <PowerIcon className="size-4" />
                      Wake
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send wake packet?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Publish wake command for <strong>{effectiveMac}</strong>{" "}
                        to <code>{wakeTopicPreview}</code>. The ESP32 bridge will
                        send the magic packet on your LAN.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleWake}>
                        Wake now
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </ButtonGroup>
            </div>

            <div
              className={cn(
                "col-start-1 row-start-1 space-y-3 [backface-visibility:hidden] [transform:rotateY(180deg)]",
                side === "wake" && "pointer-events-none opacity-0"
              )}
              aria-hidden={side === "wake"}
            >
              <p
                className={cn(
                  "text-pretty text-sm",
                  shutdownAwaitingConfirm
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {shutdownAwaitingConfirm
                  ? `Step 2 — confirm within ${shutdownSecondsLeft}s, or cancel pending.`
                  : "Step 1 — arms shutdown; press again within 1 minute to confirm."}
              </p>

              <ButtonGroup className="w-full flex-col sm:w-auto sm:flex-row">
                {shutdownAwaitingConfirm && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!valid || !isConnected}
                    className="w-full sm:w-auto"
                    onClick={handleShutdownCancel}
                  >
                    <XIcon className="size-4" />
                    Cancel
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant={
                        shutdownAwaitingConfirm ? "destructive" : "secondary"
                      }
                      disabled={!valid || !isConnected}
                      className="w-full sm:w-auto"
                    >
                      {shutdownAwaitingConfirm ? (
                        <>
                          <PowerOffIcon className="size-4" />
                          Confirm shutdown ({shutdownSecondsLeft}s)
                        </>
                      ) : (
                        <>
                          <TimerIcon className="size-4" />
                          Shutdown
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {shutdownAwaitingConfirm
                          ? "Confirm shutdown?"
                          : "Start shutdown?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        {shutdownAwaitingConfirm ? (
                          <>
                            <p>
                              Publish to <code>{shutdownConfirmPreview}</code>{" "}
                              for <strong>{effectiveMac}</strong>.
                            </p>
                            <p>
                              Step 1 was sent; the PC shuts down only if you
                              confirm within the 1-minute window (
                              {shutdownSecondsLeft}s left). Use Cancel to
                              publish <code>{shutdownCancelPreview}</code>.
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              Publish to <code>{shutdownRequestPreview}</code>{" "}
                              for <strong>{effectiveMac}</strong>.
                            </p>
                            <p>
                              This arms a pending shutdown. Press Shutdown again
                              within 1 minute to confirm.
                            </p>
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={
                          shutdownAwaitingConfirm
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : undefined
                        }
                        onClick={handleShutdownStep}
                      >
                        {shutdownAwaitingConfirm
                          ? "Confirm shutdown"
                          : "Start shutdown"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </ButtonGroup>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
