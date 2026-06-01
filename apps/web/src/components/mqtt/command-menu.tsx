"use client"

import { useState } from "react"
import {
  ActivityIcon,
  BookOpenIcon,
  LayoutDashboardIcon,
  MoonIcon,
  PlugZapIcon,
  PowerIcon,
  PowerOffIcon,
  RefreshCwIcon,
  SettingsIcon,
  TimerIcon,
  UnplugIcon,
} from "lucide-react"

import type { AppTab } from "@/components/layout/app-sidebar"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { InputGroup, InputGroupButton } from "@/components/ui/input-group"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { isValidMac } from "@/lib/mac"

type CommandMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWake: (mac: string) => void
  onShutdownRequest: (mac: string) => void
  onShutdownConfirm: (mac: string) => void
  onShutdownCancel: (mac: string) => void
  onRefreshMacList: () => void
  onConnect: () => void
  onOpenSettings: () => void
  onNavigate: (tab: AppTab) => void
  onRequestDisconnect: () => void
  onToggleTheme: () => void
  isConnected: boolean
  recentMacs: string[]
}

const navItems: {
  tab: AppTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
    { tab: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { tab: "activity", label: "Activity", icon: ActivityIcon },
    { tab: "topics", label: "Topics", icon: BookOpenIcon },
  ]

export function CommandMenu({
  open,
  onOpenChange,
  onWake,
  onShutdownRequest,
  onShutdownConfirm,
  onShutdownCancel,
  onRefreshMacList,
  onConnect,
  onOpenSettings,
  onNavigate,
  onRequestDisconnect,
  onToggleTheme,
  isConnected,
  recentMacs,
}: CommandMenuProps) {
  const [query, setQuery] = useState("")

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setQuery("")
    }
  }

  const run = (fn: () => void) => {
    fn()
    handleOpenChange(false)
  }

  return (
    <>
      <InputGroup className="w-auto">
        <InputGroupButton onClick={() => handleOpenChange(true)}>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </InputGroupButton>
      </InputGroup>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Type a command or MAC address…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {navItems.map(({ tab, label, icon: Icon }) => (
              <CommandItem
                key={tab}
                value={`nav-${tab}`}
                keywords={[label, tab]}
                onSelect={() => run(() => onNavigate(tab))}
              >
                <Icon className="size-4" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
          {isValidMac(query) && (
            <>
              <CommandGroup heading="Wake">
                <CommandItem
                  value="wake-typed-mac"
                  keywords={[query, "wake"]}
                  onSelect={() => run(() => onWake(query))}
                >
                  <PowerIcon className="size-4" />
                  Wake {query}
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Shutdown">
                <CommandItem
                  value="shutdown-request-typed-mac"
                  keywords={[query, "shutdown", "request"]}
                  onSelect={() => run(() => onShutdownRequest(query))}
                >
                  <TimerIcon className="size-4" />
                  Shutdown request {query}
                </CommandItem>
                <CommandItem
                  value="shutdown-confirm-typed-mac"
                  keywords={[query, "shutdown", "confirm"]}
                  onSelect={() => run(() => onShutdownConfirm(query))}
                >
                  <PowerOffIcon className="size-4" />
                  Shutdown confirm {query}
                </CommandItem>
                <CommandItem
                  value="shutdown-cancel-typed-mac"
                  keywords={[query, "shutdown", "cancel"]}
                  onSelect={() => run(() => onShutdownCancel(query))}
                >
                  <PowerOffIcon className="size-4" />
                  Shutdown cancel {query}
                </CommandItem>
              </CommandGroup>
            </>
          )}
          {recentMacs.length > 0 && (
            <CommandGroup heading="Recent MACs">
              {recentMacs.flatMap((mac) => [
                <CommandItem
                  key={`wake-${mac}`}
                  value={`wake-${mac}`}
                  keywords={[mac, "wake"]}
                  onSelect={() => run(() => onWake(mac))}
                >
                  <PowerIcon className="size-4" />
                  Wake {mac}
                </CommandItem>,
                <CommandItem
                  key={`shutdown-req-${mac}`}
                  value={`shutdown-req-${mac}`}
                  keywords={[mac, "shutdown", "request"]}
                  onSelect={() => run(() => onShutdownRequest(mac))}
                >
                  <TimerIcon className="size-4" />
                  Shutdown request {mac}
                </CommandItem>,
                <CommandItem
                  key={`shutdown-confirm-${mac}`}
                  value={`shutdown-confirm-${mac}`}
                  keywords={[mac, "shutdown", "confirm"]}
                  onSelect={() => run(() => onShutdownConfirm(mac))}
                >
                  <PowerOffIcon className="size-4" />
                  Shutdown confirm {mac}
                </CommandItem>,
                <CommandItem
                  key={`shutdown-cancel-${mac}`}
                  value={`shutdown-cancel-${mac}`}
                  keywords={[mac, "shutdown", "cancel"]}
                  onSelect={() => run(() => onShutdownCancel(mac))}
                >
                  <PowerOffIcon className="size-4" />
                  Shutdown cancel {mac}
                </CommandItem>,
              ])}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              value="refresh-mac-list"
              keywords={["refresh", "mac", "list", "reload"]}
              onSelect={() => run(onRefreshMacList)}
            >
              <RefreshCwIcon className="size-4" />
              Refresh MAC list
              <CommandShortcut>R</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="connect-broker"
              keywords={[
                "connect",
                "reconnect",
                "broker",
                "mqtt",
                "websocket",
              ]}
              onSelect={() => run(onConnect)}
            >
              <PlugZapIcon className="size-4" />
              {isConnected ? "Reconnect to broker" : "Connect to broker"}
              <CommandShortcut>C</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="broker-settings"
              keywords={["broker", "settings", "mqtt"]}
              onSelect={() => run(onOpenSettings)}
            >
              <SettingsIcon className="size-4" />
              Broker settings
              <CommandShortcut>S</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="toggle-theme"
              keywords={["theme", "dark", "light", "toggle"]}
              onSelect={() => run(onToggleTheme)}
            >
              <MoonIcon className="size-4" />
              Toggle theme
              <CommandShortcut>M</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="disconnect-broker"
              keywords={["disconnect", "broker", "mqtt"]}
              disabled={!isConnected}
              onSelect={() => run(onRequestDisconnect)}
            >
              <UnplugIcon className="size-4" />
              Disconnect broker
              <CommandShortcut>D</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
