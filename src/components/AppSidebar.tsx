import { NavLink, useLocation } from "react-router-dom";
import {
  Compass,
  NotebookPen,
  Gift,
  Trophy,
  Bot,
  Settings,
  LogOut,
  Building,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Compass, emoji: "🧭" },
  { name: "Daylin", href: "/daylin", icon: NotebookPen, emoji: "📝" },
  { name: "Prêmios", href: "/premios", icon: Gift, emoji: "🎁" },
  { name: "Ranking", href: "/ranking", icon: Trophy, emoji: "🏆" },
  { name: "Assistente AI", href: "/assistente", icon: Bot, emoji: "🤖" },
  { name: "Configurações", href: "/configuracoes", icon: Settings, emoji: "⚙️" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-sidebar border-sidebar-border">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="font-bold text-lg text-sidebar-foreground">SAAS FARMERS</h1>
                <p className="text-xs text-sidebar-foreground/70">TotalCAD Softwares</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={`${isCollapsed ? "sr-only" : ""} text-sidebar-foreground font-medium`}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                     <NavLink
                       to={item.href}
                       className={({ isActive }) =>
                         `flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium ${
                           isActive
                             ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                             : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                         }`
                       }
                    >
                      <span className="text-lg">{item.emoji}</span>
                      {!isCollapsed && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
        <div className="p-4">
          {!isCollapsed && profile && (
            <div className="mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                 <div className="flex flex-col">
                   <span className="text-sm font-medium text-sidebar-foreground">{profile.name}</span>
                   <span className="text-xs text-sidebar-foreground/70 capitalize">
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className={`${isCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"} text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent`}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}