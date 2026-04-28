import { useGetOrderStats, useGetRecentOrders, useListOrders } from "@workspace/api-client-react";
import { OrderCard } from "@/components/OrderCard";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Clock, Package, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function Dashboard() {
  const { data: stats } = useGetOrderStats({ query: { refetchInterval: 3000 } });
  const { data: recentOrders = [] } = useGetRecentOrders({ query: { refetchInterval: 3000 } });
  
  // Get specifically pending and accepted orders for the active board
  const pendingOrders = recentOrders.filter(o => o.status === "pending");
  const acceptedOrders = recentOrders.filter(o => o.status === "accepted");
  const readyOrders = recentOrders.filter(o => o.status === "ready");

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Aujourd'hui</p>
              <p className="text-3xl font-black">{stats?.totalToday || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Revenu</p>
              <p className="text-3xl font-black text-primary">{formatCurrency(stats?.totalRevenue || 0)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-950/20 border-amber-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-1">En attente</p>
              <p className="text-3xl font-black text-amber-500">{stats?.pendingCount || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-950/20 border-green-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-500 font-bold uppercase tracking-widest mb-1">Prêts</p>
              <p className="text-3xl font-black text-green-500">{stats?.readyCount || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders Board */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Column 1: Pending */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
            <h2 className="text-lg font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              À Accepter ({pendingOrders.length})
            </h2>
          </div>
          <div className="space-y-4">
            {pendingOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
            {pendingOrders.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground font-bold">
                Aucune commande en attente
              </div>
            )}
          </div>
        </div>

        {/* Column 2: In Kitchen */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-blue-500/30 pb-2">
            <h2 className="text-lg font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              En Cuisine ({acceptedOrders.length})
            </h2>
          </div>
          <div className="space-y-4">
            {acceptedOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
            {acceptedOrders.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground font-bold">
                Aucune commande en préparation
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-green-500/30 pb-2">
            <h2 className="text-lg font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Prêts ({readyOrders.length})
            </h2>
          </div>
          <div className="space-y-4">
            {readyOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
            {readyOrders.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground font-bold">
                Aucun sac en attente
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
