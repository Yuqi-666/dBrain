import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader,
} from "@workspace/ui/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@workspace/ui/components/ui/collapsible"
import {
  Plus,
  ChevronDown,
} from "lucide-react"
import { ToggleSidebarButton } from "./header/toggle-sidebar-button"

export function AppSidebar() {
  return (
    <Sidebar>
      <ToggleSidebarButton />
    </Sidebar>
  )
}
