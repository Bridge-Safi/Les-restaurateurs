import { Link, useLocation } from "wouter";
import { LayoutDashboard, History } from "lucide-react";
import { useAlarm } from "@/contexts/AlarmContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { pendingOrders } = useAlarm();

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">Bridge Restaurant</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link
            href="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
              location === "/"
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
            {pendingOrders.length > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pendingOrders.length}
              </span>
            )}
          </Link>
          <Link
            href="/orders"
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
              location.startsWith("/orders")
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
            data-testid="nav-orders"
          >
            <History className="w-5 h-5" />
            <span>Historique</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-sm font-medium text-muted-foreground">En direct</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
