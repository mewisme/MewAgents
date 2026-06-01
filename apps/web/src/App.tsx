import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppShell } from "@/components/layout/app-shell"
import { HotkeysProvider } from "@tanstack/react-hotkeys"

export default function App() {
  return (
    <HotkeysProvider defaultOptions={{ hotkey: { preventDefault: false } }}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <AppShell />
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </ThemeProvider>
    </HotkeysProvider>
  )
}
