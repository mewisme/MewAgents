"use client"

import {
  ActivityIcon,
  BookOpenIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  WifiIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type AppTab = "dashboard" | "activity" | "topics" | "settings"

type AppSidebarProps = {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  onOpenSettings: () => void
}

const navItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "topics", label: "Topics", icon: BookOpenIcon },
]

export function AppSidebar({
  activeTab,
  onTabChange,
  onOpenSettings,
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <WifiIcon className="size-5" />
          WOL Service
        </div>
        <p className="text-xs text-muted-foreground">Wake-on-LAN bridge UI</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={activeTab === id}
                    onClick={() => onTabChange(id)}
                  >
                    <Icon className="size-4" />
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenSettings}>
              <SettingsIcon className="size-4" />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
