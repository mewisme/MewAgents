"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { AppSidebar, type AppTab } from "@/components/layout/app-sidebar"
import { AppHotkeys } from "@/components/layout/app-hotkeys"
import { BrokerSettingsDialog } from "@/components/mqtt/broker-settings-dialog"
import { CommandMenu } from "@/components/mqtt/command-menu"
import { ConnectionStatus } from "@/components/mqtt/connection-status"
import { RecentMacsTable } from "@/components/mqtt/recent-macs-table"
import { ResultLog } from "@/components/mqtt/result-log"
import { TopicReference } from "@/components/mqtt/topic-reference"
import { PcActionFlipCard } from "@/components/mqtt/pc-action-flip-card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMqttManager } from "@/hooks/use-mqtt-manager"
import { isPlaceholderMqttUri } from "@/types/mqtt"
import { ModeToggle } from "./mode-toggle"

const tabLabels: Record<AppTab, string> = {
  dashboard: "Dashboard",
  activity: "Activity",
  topics: "Topics",
  settings: "Settings",
}

export function AppShell() {
  const { theme, setTheme } = useTheme()
  const {
    connectionState,
    lastError,
    recentMacs,
    results,
    messageLog,
    isConnected,
    config,
    connect,
    disconnect,
    wake,
    shutdownRequest,
    shutdownConfirm,
    shutdownCancel,
    requestMacList,
    clearLogs,
    updateConfig,
  } = useMqttManager()

  const [activeTab, setActiveTab] = useState<AppTab>("dashboard")
  const [commandOpen, setCommandOpen] = useState(false)
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedMac, setSelectedMac] = useState("")
  const [selectedMacs, setSelectedMacs] = useState<Set<string>>(new Set())
  const [macListLoading, setMacListLoading] = useState(false)

  const lastResultByMac = useMemo(() => {
    const map = new Map<string, (typeof results)[0]>()
    for (const r of results) {
      if (!map.has(r.mac)) {
        map.set(r.mac, r)
      }
    }
    return map
  }, [results])

  const handleRefreshMacList = () => {
    setMacListLoading(true)
    requestMacList()
    setTimeout(() => setMacListLoading(false), 800)
  }

  const canConnect = !isPlaceholderMqttUri(config.uri)

  const handleConnect = (cfg = config) => {
    connect(cfg)
    toast.info("Connecting to broker…")
  }

  const handleConnectOrReconnect = () => {
    if (!canConnect) {
      toast.error("Configure broker URL in settings first")
      setSettingsOpen(true)
      return
    }
    handleConnect()
  }

  const handleDisconnect = () => {
    disconnect()
    toast.info("Disconnected")
  }

  const handleWake = (mac: string) => {
    if (wake(mac)) {
      toast.success(`Wake published for ${mac}`)
    } else {
      toast.error(lastError ?? "Failed to publish wake")
    }
  }

  const handleShutdownRequest = (mac: string) => {
    if (shutdownRequest(mac)) {
      toast.success(`Shutdown requested for ${mac} — confirm within 1 minute`)
    } else {
      toast.error(lastError ?? "Failed to publish shutdown request")
    }
  }

  const handleShutdownConfirm = (mac: string) => {
    if (shutdownConfirm(mac)) {
      toast.success(`Shutdown confirm published for ${mac}`)
    } else {
      toast.error(lastError ?? "Failed to publish shutdown confirm")
    }
  }

  const handleShutdownCancel = (mac: string) => {
    if (shutdownCancel(mac)) {
      toast.success(`Shutdown cancelled for ${mac}`)
    } else {
      toast.error(lastError ?? "Failed to publish shutdown cancel")
    }
  }

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{tabLabels[activeTab]}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CommandMenu
              open={commandOpen}
              onOpenChange={setCommandOpen}
              onWake={handleWake}
              onShutdownRequest={handleShutdownRequest}
              onShutdownConfirm={handleShutdownConfirm}
              onShutdownCancel={handleShutdownCancel}
              onRefreshMacList={handleRefreshMacList}
              onConnect={handleConnectOrReconnect}
              onOpenSettings={() => setSettingsOpen(true)}
              onNavigate={setActiveTab}
              onRequestDisconnect={() => setDisconnectConfirmOpen(true)}
              onToggleTheme={handleToggleTheme}
              isConnected={isConnected}
              recentMacs={recentMacs}
            />
            <ModeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as AppTab)}
            className="w-full"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList variant="line">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="topics">Topics</TabsTrigger>
              </TabsList>
              <ConnectionStatus
                state={connectionState}
                lastError={lastError}
                compact
              />
            </div>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <PcActionFlipCard
                  isConnected={isConnected}
                  recentMacs={recentMacs}
                  selectedMac={selectedMac}
                  onSelectedMacChange={setSelectedMac}
                  onWake={handleWake}
                  onShutdownRequest={handleShutdownRequest}
                  onShutdownConfirm={handleShutdownConfirm}
                  onShutdownCancel={handleShutdownCancel}
                />
                <RecentMacsTable
                  macs={recentMacs}
                  isConnected={isConnected}
                  isLoading={macListLoading}
                  selectedMacs={selectedMacs}
                  onSelectedMacsChange={setSelectedMacs}
                  onWake={handleWake}
                  onRefresh={handleRefreshMacList}
                  lastResultByMac={lastResultByMac}
                />
              </div>

            </TabsContent>

            <TabsContent value="activity">
              <ResultLog
                results={results}
                messageLog={messageLog}
                onClear={clearLogs}
              />
            </TabsContent>

            <TabsContent value="topics">
              <TopicReference />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>

      <AppHotkeys
        commandOpen={commandOpen}
        setCommandOpen={setCommandOpen}
        settingsOpen={settingsOpen}
        disconnectConfirmOpen={disconnectConfirmOpen}
        setDisconnectConfirmOpen={setDisconnectConfirmOpen}
        isConnected={isConnected}
        onRefreshMacList={handleRefreshMacList}
        onConnect={handleConnectOrReconnect}
        onOpenSettings={() => setSettingsOpen(true)}
        onDisconnect={handleDisconnect}
      />

      <BrokerSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        onSave={updateConfig}
        onConnect={handleConnect}
      />
    </SidebarProvider >
  )
}
