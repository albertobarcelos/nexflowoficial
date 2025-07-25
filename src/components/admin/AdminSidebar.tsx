import {
  BarChart3,
  Building2,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/admin/dashboard",
  },
  {
    title: "Clientes",
    icon: Building2,
    url: "/admin/clients",
  },
  {
    title: "Relatórios",
    icon: FileText,
    url: "/admin/reports",
  },
  {
    title: "Usuários",
    icon: Users,
    url: "/admin/users",
  },
  {
    title: "Análises",
    icon: BarChart3,
    url: "/admin/analytics",
  },
  {
    title: "Configurações",
    icon: Settings,
    url: "/admin/settings",
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/admin/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro ao fazer logout",
        description: "Ocorreu um erro ao tentar desconectar.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">Portal Administrador</h2>
        <p className="text-sm text-muted-foreground">OEM Nexsyn</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      location.pathname === item.url && "bg-muted"
                    )}
                  >
                    <Link
                      to={item.url}
                      className="flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
