"use client"

import { useMemo, useState } from "react"
import { format, isSameDay } from "date-fns"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Trash2Icon } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useIsMobile } from "@/hooks/use-mobile"
import type { MqttMessageLogEntry, WakeupResultEntry } from "@/types/mqtt"
import { MQTT_SUB_ALL } from "@/lib/topics"

const chartConfig = {
  sent: { label: "Sent", color: "var(--chart-1)" },
  error: { label: "Error", color: "var(--chart-5)" },
} satisfies ChartConfig

const STATS_MIN_WIDTH_PX = 280
const LOG_MIN_WIDTH_PX = 420
const CHART_HEIGHT_CLASS = "h-[220px] sm:h-[280px]"

type ResultLogProps = {
  results: WakeupResultEntry[]
  messageLog: MqttMessageLogEntry[]
  onClear: () => void
}

function StatsCard({ chartData }: { chartData: { status: string; count: number; fill: string }[] }) {
  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader>
        <CardTitle>Stats</CardTitle>
        <CardDescription>Wake results in current filter</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className={`${CHART_HEIGHT_CLASS} w-full`}
        >
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="status" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

type LogCardProps = {
  viewMode: "compact" | "verbose"
  filteredMessages: MqttMessageLogEntry[]
  pageMessages: MqttMessageLogEntry[]
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function LogCard({
  viewMode,
  filteredMessages,
  pageMessages,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: LogCardProps) {
  return (
    <Card className="h-full min-w-0 border-0 shadow-none">
      <CardHeader>
        <CardTitle>MQTT log</CardTitle>
        <CardDescription className="text-pretty">
          Subscribed to <code className="text-xs">{MQTT_SUB_ALL}</code> — all
          broker traffic; commands publish to{" "}
          <code className="text-xs">wakeup/&lt;MAC&gt;</code>,{" "}
          <code className="text-xs">shutdown/&lt;MAC&gt;</code>,{" "}
          <code className="text-xs">shutdown/&lt;MAC&gt;/confirm</code>,{" "}
          <code className="text-xs">shutdown/&lt;MAC&gt;/cancel</code>, and{" "}
          <code className="text-xs">mac/list/get</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredMessages.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No messages yet</EmptyTitle>
              <EmptyDescription>
                All MQTT traffic on the broker appears here in real time.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ScrollArea className={`${CHART_HEIGHT_CLASS} pr-4`}>
              {viewMode === "compact" ? (
                <div className="space-y-2">
                  {pageMessages.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              m.direction === "tx" ? "secondary" : "outline"
                            }
                          >
                            {m.direction.toUpperCase()}
                          </Badge>
                          <span className="break-all font-mono text-xs">
                            {m.topic}
                          </span>
                        </div>
                        {m.payload && (
                          <p className="break-all text-muted-foreground text-xs">
                            {m.payload}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-muted-foreground text-xs sm:text-right">
                        {format(m.receivedAt, "HH:mm:ss")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Accordion type="multiple" className="w-full min-w-0">
                  {pageMessages.map((m) => (
                    <AccordionItem key={m.id} value={m.id}>
                      <AccordionTrigger className="text-left text-sm [&>svg]:shrink-0">
                        <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span className="flex shrink-0 items-center gap-2">
                            <Badge
                              variant={
                                m.direction === "tx" ? "secondary" : "outline"
                              }
                            >
                              {m.direction.toUpperCase()}
                            </Badge>
                          </span>
                          <span className="min-w-0 break-all font-mono text-xs">
                            {m.topic}
                          </span>
                          <span className="shrink-0 text-muted-foreground text-xs">
                            {format(m.receivedAt, "PPpp")}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Textarea
                          readOnly
                          className="font-mono text-xs"
                          value={JSON.stringify(
                            {
                              topic: m.topic,
                              direction: m.direction,
                              payload: m.payload || "(empty)",
                              receivedAt: m.receivedAt.toISOString(),
                            },
                            null,
                            2
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </ScrollArea>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                </SelectContent>
              </Select>
              <Pagination className="mx-0 w-full justify-center sm:mx-auto sm:w-auto">
                <PaginationContent className="flex-wrap">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        onPageChange(Math.max(1, page - 1))
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault()
                            onPageChange(p)
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        onPageChange(Math.min(totalPages, page + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ResultLog({ results, messageLog, onClear }: ResultLogProps) {
  const isMobile = useIsMobile()
  const [viewMode, setViewMode] = useState<"compact" | "verbose">("compact")
  const [filterDate, setFilterDate] = useState<Date | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [maxEntries, setMaxEntries] = useState(100)

  const filtered = useMemo(() => {
    let list = results.slice(0, maxEntries)
    if (filterDate) {
      list = list.filter((r) => isSameDay(r.receivedAt, filterDate))
    }
    return list
  }, [results, filterDate, maxEntries])

  const chartData = useMemo(() => {
    const counts = { sent: 0, error: 0 }
    for (const r of filtered) {
      counts[r.status]++
    }
    return [
      { status: "sent", count: counts.sent, fill: "var(--color-sent)" },
      { status: "error", count: counts.error, fill: "var(--color-error)" },
    ]
  }, [filtered])

  const filteredMessages = useMemo(() => {
    let list = messageLog.slice(0, maxEntries)
    if (filterDate) {
      list = list.filter((m) => isSameDay(m.receivedAt, filterDate))
    }
    return list
  }, [messageLog, filterDate, maxEntries])

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize))
  const pageMessages = filteredMessages.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const logCard = (
    <LogCard
      viewMode={viewMode}
      filteredMessages={filteredMessages}
      pageMessages={pageMessages}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size)
        setPage(1)
      }}
    />
  )

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "compact" | "verbose")}
            className="w-full sm:w-auto"
          >
            <ToggleGroupItem value="compact" size="sm" className="flex-1 sm:flex-none">
              Compact
            </ToggleGroupItem>
            <ToggleGroupItem value="verbose" size="sm" className="flex-1 sm:flex-none">
              Verbose
            </ToggleGroupItem>
          </ToggleGroup>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {filterDate ? format(filterDate, "PPP") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
              />
              {filterDate && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setFilterDate(undefined)}
                  >
                    Clear filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <div className="flex min-w-0 items-center gap-2">
            <Label className="shrink-0 text-sm text-muted-foreground">
              Max entries
            </Label>
            <Slider
              className="min-w-0 flex-1 sm:w-32 sm:flex-none"
              min={20}
              max={200}
              step={10}
              value={[maxEntries]}
              onValueChange={([v]) => setMaxEntries(v)}
            />
            <span className="shrink-0 text-sm tabular-nums">{maxEntries}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="w-full sm:w-auto"
        >
          <Trash2Icon className="size-4" />
          Clear log
        </Button>
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-4 rounded-lg border">
          <StatsCard chartData={chartData} />
          {logCard}
        </div>
      ) : (
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-[420px] rounded-lg border"
        >
          <ResizablePanel
            id="stats"
            defaultSize={35}
            minSize={STATS_MIN_WIDTH_PX}
          >
            <div className="h-full" style={{ minWidth: STATS_MIN_WIDTH_PX }}>
              <StatsCard chartData={chartData} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="result-log"
            defaultSize={65}
            minSize={LOG_MIN_WIDTH_PX}
          >
            <div className="min-w-0 h-full" style={{ minWidth: LOG_MIN_WIDTH_PX }}>
              {logCard}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}
