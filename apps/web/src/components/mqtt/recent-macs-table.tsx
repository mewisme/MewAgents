"use client"

import { toast } from "sonner"
import {
  CopyIcon,
  MoreHorizontalIcon,
  PowerIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { macAvatarHue } from "@/lib/mac"
import type { WakeupResultEntry } from "@/types/mqtt"

type RecentMacsTableProps = {
  macs: string[]
  isConnected: boolean
  isLoading?: boolean
  selectedMacs: Set<string>
  onSelectedMacsChange: (macs: Set<string>) => void
  onWake: (mac: string) => void
  onRefresh: () => void
  lastResultByMac: Map<string, WakeupResultEntry>
}

function MacAvatar({ mac }: { mac: string }) {
  const hue = macAvatarHue(mac)
  const initials = mac.replace(/[^A-Fa-f0-9]/g, "").slice(0, 2).toUpperCase()
  return (
    <Avatar className="size-8">
      <AvatarFallback
        style={{ backgroundColor: `hsl(${hue} 60% 45%)`, color: "white" }}
        className="text-xs font-mono"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function RecentMacsTable({
  macs,
  isConnected,
  isLoading = false,
  selectedMacs,
  onSelectedMacsChange,
  onWake,
  onRefresh,
  lastResultByMac,
}: RecentMacsTableProps) {
  const toggleMac = (mac: string, checked: boolean) => {
    const next = new Set(selectedMacs)
    if (checked) {
      next.add(mac)
    } else {
      next.delete(mac)
    }
    onSelectedMacsChange(next)
  }

  const wakeSelected = () => {
    for (const mac of selectedMacs) {
      onWake(mac)
    }
    toast.info(`Wake sent for ${selectedMacs.size} MAC(s)`)
  }

  const copyMac = (mac: string) => {
    void navigator.clipboard.writeText(mac)
    toast.success("Copied MAC")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent MACs</CardTitle>
          <CardDescription>
            Request via <code className="text-xs">mac/list/get</code>
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {selectedMacs.size > 0 && (
            <Button size="sm" variant="secondary" onClick={wakeSelected}>
              Wake selected ({selectedMacs.size})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={!isConnected}
          >
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : macs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RefreshCwIcon />
              </EmptyMedia>
              <EmptyTitle>No recent MACs</EmptyTitle>
              <EmptyDescription>
                Wake a device or refresh after Redis is configured on the ESP32.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>MAC</TableHead>
                <TableHead>Last result</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {macs.map((mac) => {
                const last = lastResultByMac.get(mac)
                return (
                  <ContextMenu key={mac}>
                    <ContextMenuTrigger asChild>
                      <TableRow>
                        <TableCell>
                          <Checkbox
                            checked={selectedMacs.has(mac)}
                            onCheckedChange={(c) =>
                              toggleMac(mac, c === true)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Item className="p-0">
                            <MacAvatar mac={mac} />
                            <ItemContent>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <ItemTitle className="cursor-default font-mono text-sm">
                                    {mac}
                                  </ItemTitle>
                                </HoverCardTrigger>
                                <HoverCardContent>
                                  {last ? (
                                    <div className="space-y-1 text-sm">
                                      <p>
                                        Status:{" "}
                                        <Badge
                                          variant={
                                            last.status === "sent"
                                              ? "default"
                                              : "destructive"
                                          }
                                        >
                                          {last.status}
                                        </Badge>
                                      </p>
                                      <p>Broadcast: {last.broadcast}</p>
                                      {last.message && (
                                        <p>{last.message}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      No wake result yet for this MAC.
                                    </p>
                                  )}
                                </HoverCardContent>
                              </HoverCard>
                            </ItemContent>
                          </Item>
                        </TableCell>
                        <TableCell>
                          {last ? (
                            <Badge
                              variant={
                                last.status === "sent"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {last.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ItemActions>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onWake(mac)}
                                >
                                  <PowerIcon className="size-4" />
                                  Wake
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => copyMac(mac)}
                                >
                                  <CopyIcon className="size-4" />
                                  Copy MAC
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ItemActions>
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => onWake(mac)}>
                        Wake
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => copyMac(mac)}>
                        Copy MAC
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
