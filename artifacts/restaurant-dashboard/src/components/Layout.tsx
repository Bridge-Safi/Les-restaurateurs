import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, Clock, LogOut } from "lucide-react";
import { BridgeLogo } from "./BridgeLogo";
import { useAlarm } from "@/contexts/AlarmContext";
import { useUser, useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { pendingOrders, testAlarm } = useAlarm();
  const [time, setTime] = useState(new Date());
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const navItems = [
    { href: "/", label: "Tableau de bord", icon: LayoutGrid },
    { href: "/orders", label: "Historique", icon: Clock },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-[#F4F5F7] overflow-hidden">
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col shadow-lg z-20"
        style={{ background: "linear-gradient(160deg, #FF6B35 0%, #E04E1A 100%)" }}
      >
        {/* Brand */}
        <div className="px-5 py-6 flex items-center gap-3">
          <BridgeLogo size={40} />
          <div>
            <span className="font-black text-white text-xl tracking-tight leading-none block">Bridge</span>
            <span className="font-black text-white/80 text-xl tracking-tight leading-none block">Eats</span>
          </div>
        </div>

        {/* Subtitle */}
        <div className="px-5 mb-6">
          <span className="text-white/50 text-xs font-medium uppercase tracking-widest">
            Tableau de bord
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.href === "/" ? "dashboard" : "orders"}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative cursor-pointer ${
                    isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  <span className="font-semibold text-sm">{item.label}</span>
                  {item.href === "/" && pendingOrders.length > 0 && (
                    <span className="ml-auto bg-white text-orange-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="text-center">
            <p className="text-white font-bold text-2xl tracking-widest">{timeStr}</p>
            <p className="text-white/50 text-xs">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user.firstName?.[0] ?? user.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {user.firstName ?? user.emailAddresses?.[0]?.emailAddress}
                </p>
                <p className="text-white/50 text-xs truncate">
                  {user.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={testAlarm}
              data-testid="btn-test-alarm"
              className="flex-1 text-xs text-white/60 hover:text-white/90 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Tester l'alarme
            </button>
            <button
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              data-testid="btn-sign-out"
              className="text-white/60 hover:text-white/90 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Se déconnecter"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              En direct
            </span>
          </div>
          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-sm font-bold text-orange-700">
                {pendingOrders.length} commande{pendingOrders.length > 1 ? "s" : ""} en attente
              </span>
            </div>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
