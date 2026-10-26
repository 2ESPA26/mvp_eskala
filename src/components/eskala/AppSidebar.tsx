import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BellRing, ClipboardPen, LayoutDashboard, History } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useEskala } from "@/lib/eskala/store";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Central de Alertas", url: "/alertas", icon: BellRing },
  { title: "Equipamentos e Telemetria", url: "/telemetria", icon: Activity },
  { title: "Registro de Intervenção", url: "/intervencao", icon: ClipboardPen },
  { title: "Histórico de Intervenções", url: "/historico", icon: History },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <div className="grid size-8 shrink-0 place-items-center rounded-none bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19h4l8-12h4" />
        </svg>
      </div>
      <span className="border-b-2 border-highlight pb-0.5 font-display text-lg font-semibold tracking-[0.18em] group-data-[collapsible=icon]:hidden">ESKALA</span>
    </div>
  );
}

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { alerts } = useEskala();
  const open = alerts.filter((a) => a.open).length;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center justify-between gap-2 px-3 py-4 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-2">
        <Logo />
        <SidebarTrigger className="text-sidebar-foreground/70" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title} className="h-10">
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.url === "/alertas" && <SidebarMenuBadge className="text-status-high">{open}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4 text-[11px] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
        Monitoramento CBM
        <br />
        Dados simulados
      </SidebarFooter>
    </Sidebar>
  );
}
