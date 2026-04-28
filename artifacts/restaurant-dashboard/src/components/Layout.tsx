import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, History, LogOut, Bell } from "lucide-react";
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

  const timeStr = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const navItems = [
    { href: "/", label: "Tableau de bord", icon: LayoutGrid },
    { href: "/orders", label: "Historique", icon: History },
  ];

  const initials = (
    user?.firstName?.[0] ??
    user?.emailAddresses?.[0]?.emailAddress?.[0] ??
    "?"
  ).toUpperCase();

  return (
    <div className="flex h-[100dvh] w-full bg-[#F7F8FA] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-gray-900 border-r border-white/5">

        {/* Brand */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 12 C3 7 15 7 15 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <line x1="3" y1="12" x2="3" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="15" y1="12" x2="15" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="2" y1="15" x2="16" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="7.5" y1="3.5" x2="7.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="3.5" x2="9" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="10.5" y1="3.5" x2="10.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="8" x2="9" y2="11" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">Bridge Eats</span>
        </div>

        {/* Clock */}
        <div className="px-5 pb-5 border-b border-white/5">
          <p className="text-white font-bold text-2xl tabular-nums">{timeStr}</p>
          <p className="text-gray-500 text-xs mt-0.5 capitalize">
            {time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.href === "/" ? "dashboard" : "orders"}`}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer relative ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.href === "/" && pendingOrders.length > 0 && (
                    <span className="ml-auto bg-[#FF6B35] text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Test alarm */}
        <div className="px-3 pb-3">
          <button
            onClick={testAlarm}
            data-testid="btn-test-alarm"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all text-sm"
          >
            <Bell size={15} />
            Tester l'alarme
          </button>
        </div>

        {/* User */}
        <div className="px-3 pb-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center text-xs font-bold text-[#FF6B35] flex-shrink-0 overflow-hidden">
              {user?.imageUrl
                ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs font-semibold truncate">
                {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Utilisateur"}
              </p>
              <p className="text-gray-600 text-xs truncate">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              data-testid="btn-sign-out"
              title="Se déconnecter"
              className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded flex-shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">En direct</span>
          </div>
          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping flex-shrink-0" />
              <span className="text-sm font-bold text-orange-600">
                {pendingOrders.length} commande{pendingOrders.length > 1 ? "s" : ""} en attente
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
