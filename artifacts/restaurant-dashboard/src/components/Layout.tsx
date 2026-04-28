import React from "react";
import { Link, useLocation } from "wouter";
import { useAlarm } from "@/contexts/AlarmContext";
import { BellRing, LayoutDashboard, ListOrdered, Settings, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { pendingOrders, testAlarm } = useAlarm();
  
  const pendingCount = pendingOrders.length;

  return (
    <div className="min-h-screen bg-background flex flex-col font-mono text-sm">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tighter text-primary">
            BRIDGE<span className="text-foreground">/KITCHEN</span>
          </h1>
          
          <div className="flex items-center gap-2 text-green-500 font-bold px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse-dot" />
            EN DIRECT
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={testAlarm} className="border-muted hover:bg-muted text-muted-foreground">
            <BellRing className="w-4 h-4 mr-2" />
            Test Alarme
          </Button>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div className="font-bold text-lg leading-none">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/50 flex flex-col p-4 gap-2">
          <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === '/' ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted text-muted-foreground'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-bold uppercase tracking-wider">Dashboard</span>
            {pendingCount > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full animate-flash-alarm">
                {pendingCount}
              </span>
            )}
          </Link>
          
          <Link href="/orders" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === '/orders' ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted text-muted-foreground'}`}>
            <ListOrdered className="w-5 h-5" />
            <span className="font-bold uppercase tracking-wider">Historique</span>
          </Link>
          
          <div className="mt-auto">
            <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border/50 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              Système opérationnel
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
