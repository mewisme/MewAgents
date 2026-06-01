"use client"

import { useHotkeys } from "@tanstack/react-hotkeys"
import { useTheme } from "next-themes"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { isEditableTarget } from "@/lib/hotkeys"

type AppHotkeysProps = {
  commandOpen: boolean
  setCommandOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  settingsOpen: boolean
  disconnectConfirmOpen: boolean
  setDisconnectConfirmOpen: (open: boolean) => void
  isConnected: boolean
  onRefreshMacList: () => void
  onConnect: () => void
  onOpenSettings: () => void
  onDisconnect: () => void
}

export function AppHotkeys({
  commandOpen,
  setCommandOpen,
  settingsOpen,
  disconnectConfirmOpen,
  setDisconnectConfirmOpen,
  isConnected,
  onRefreshMacList,
  onConnect,
  onOpenSettings,
  onDisconnect,
}: AppHotkeysProps) {
  const { theme, setTheme } = useTheme()

  const shortcutsBlocked =
    commandOpen || settingsOpen || disconnectConfirmOpen

  useHotkeys([
    {
      hotkey: "Mod+K",
      callback: () => setCommandOpen((open) => !open),
      options: { preventDefault: true },
    },
    {
      hotkey: "R",
      callback: (event) => {
        if (isEditableTarget(event.target) || shortcutsBlocked) {
          return
        }
        event.preventDefault()
        onRefreshMacList()
      },
    },
    {
      hotkey: "C",
      callback: (event) => {
        if (isEditableTarget(event.target) || shortcutsBlocked) {
          return
        }
        event.preventDefault()
        onConnect()
      },
    },
    {
      hotkey: "S",
      callback: (event) => {
        if (isEditableTarget(event.target) || shortcutsBlocked) {
          return
        }
        event.preventDefault()
        onOpenSettings()
      },
    },
    {
      hotkey: "D",
      callback: (event) => {
        if (isEditableTarget(event.target) || shortcutsBlocked || !isConnected) {
          return
        }
        event.preventDefault()
        setDisconnectConfirmOpen(true)
      },
    },
    {
      hotkey: "M",
      callback: (event) => {
        if (isEditableTarget(event.target) || shortcutsBlocked) {
          return
        }
        event.preventDefault()
        setTheme(theme === "dark" ? "light" : "dark")
      },
    },
  ])

  const handleDisconnectConfirm = () => {
    onDisconnect()
    setDisconnectConfirmOpen(false)
  }

  return (
    <AlertDialog
      open={disconnectConfirmOpen}
      onOpenChange={setDisconnectConfirmOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect from broker?</AlertDialogTitle>
          <AlertDialogDescription>
            This closes the WebSocket connection. You can reconnect from Settings
            at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDisconnectConfirm}>
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
