import { Link, useLocation } from "wouter";
import { LayoutDashboard, Film, Settings, LogOut, ActivitySquare } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";

export function AdminSidebar() {
  const [location] = useLocation();
  const { logout } = useRequireAuth();

  const links = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/activities", label: "Activities", icon: Film },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-card border-r border-border min-h-screen flex flex-col z-20 relative shadow-2xl">
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <ActivitySquare className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-display font-bold text-xl tracking-tight">Arena<span className="text-primary">OS</span></h1>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {links.map((link) => {
          const isActive = location.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="block">
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
                ${isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"}
              `}>
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {link.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
