import {
  LayoutDashboard, BarChart3, Database, Calendar, Activity,
  ClipboardCheck, Scale, Settings, LogOut, Bot
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Reports & Analytics", url: "/reports", icon: BarChart3 },
  { title: "Content Management", url: "/content", icon: Database },
  { title: "Scheduling", url: "/scheduling", icon: Calendar },
  { title: "Live Monitoring", url: "/monitoring", icon: Activity },
  { title: "Review Queue", url: "/review", icon: ClipboardCheck },
  { title: "Governance", url: "/governance", icon: Scale },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isActive = (url: string) => location.pathname.startsWith(url);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-sidebar-accent-foreground">AI Interviewer</div>
          <div className="text-xs text-sidebar-foreground">Admin Panel</div>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        isActive(item.url)
                          ? "bg-sidebar-accent text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {user ? getUserInitials(user.fullName || user.email) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {user?.fullName || user?.email || 'User'}
            </div>
            <div className="text-xs text-sidebar-foreground truncate">
              {user?.email || 'user@example.com'}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sidebar-foreground hover:text-destructive transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
