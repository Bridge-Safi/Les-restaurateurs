import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrderStats,
  useGetRecentOrders,
  useMarkOrderReady,
  useCreateOrder,
  getGetOrderStatsQueryKey,
  getGetRecentOrdersQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react/src/generated/api.schemas";
import { useAlarm } from "@/contexts/AlarmContext";
import { formatCurrency, formatTimeAgo } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  Clock,
  Euro,
  Timer,
  CheckCircle,
  XCircle,
  ChefHat,
  Bell,
  Zap,
  MapPin,
} from "lucide-react";

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, string> = {
    "Bridge Eats": "bg-[#FF6B35] text-white",
    "Uber Eats": "bg-black text-white",
    "Deliveroo": "bg-[#00CDBC] text-white",
    "Just Eat": "bg-[#FF8000] text-white",
  };
  const cls = styles[platform] ?? "bg-gray-200 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {platform}
    </span>
  );
}

function StatusKanban({ status, label, color, count, children }: {
  status: string; label: string; color: string; count: number; children: React.ReactNode;
}) {
  const headerColors: Record<string, string> = {
    orange: "bg-orange-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
  };
  return (
    <div className="flex flex-col min-h-0 flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`${headerColors[color]} px-5 py-4 flex items-center justify-between`}>
        <span className="text-white font-bold text-sm uppercase tracking-wider">{label}</span>
        <span className="bg-white/25 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, onAccept, onReject, onReady }: {
  order: Order;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  onReady?: (id: number) => void;
}) {
  const isPending = order.status === "pending";
  const isAccepted = order.status === "accepted";
  const leftBorder = isPending
    ? "border-l-4 border-l-orange-400"
    : isAccepted
    ? "border-l-4 border-l-blue-400"
    : "border-l-4 border-l-emerald-400";
  const bgTint = isPending ? "bg-orange-50/50" : "bg-white";

  return (
    <div
      data-testid={`order-card-${order.id}`}
      className={`rounded-xl p-4 shadow-sm border border-gray-100 ${leftBorder} ${bgTint} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-base">#{order.orderNumber}</span>
          <PlatformBadge platform={order.platform} />
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</div>
          <div className="text-xs text-gray-400">{formatTimeAgo(order.createdAt)}</div>
        </div>
      </div>

      <div className="mb-2">
        <p className="font-semibold text-gray-800 text-sm">{order.customerName}</p>
        {order.deliveryAddress && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {order.deliveryAddress}
          </p>
        )}
      </div>

      <div className="text-xs text-gray-600 space-y-0.5 mb-3">
        {order.items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex gap-1">
            <span className="font-medium text-gray-700">{item.quantity}x</span>
            <span>{item.name}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="text-gray-400 italic">+{order.items.length - 3} autre(s)</div>
        )}
      </div>

      {order.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-3 text-xs text-yellow-800">
          {order.notes}
        </div>
      )}

      {order.estimatedPrepTime && isAccepted && (
        <div className="flex items-center gap-1 text-xs text-blue-600 mb-3">
          <Timer size={12} />
          <span>Prêt dans ~{order.estimatedPrepTime} min</span>
        </div>
      )}

      {isPending && onAccept && onReject && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onReject(order.id)}
            data-testid={`btn-reject-${order.id}`}
            className="text-xs"
          >
            <XCircle size={14} className="mr-1" /> Refuser
          </Button>
          <Button
            size="sm"
            onClick={() => onAccept(order.id)}
            data-testid={`btn-accept-${order.id}`}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
          >
            <CheckCircle size={14} className="mr-1" /> Accepter
          </Button>
        </div>
      )}

      {isAccepted && onReady && (
        <Button
          size="sm"
          onClick={() => onReady(order.id)}
          data-testid={`btn-ready-${order.id}`}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        >
          <ChefHat size={14} className="mr-1" /> Marquer comme prête
        </Button>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sublabel?: string;
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    green: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { pendingOrders, acceptSingleOrder, rejectSingleOrder } = useAlarm();
  const { data: stats, isLoading: statsLoading } = useGetOrderStats();
  const { data: recentOrders = [], isLoading: ordersLoading } = useGetRecentOrders();
  const markReady = useMarkOrderReady();
  const createOrder = useCreateOrder();

  const [acceptDialog, setAcceptDialog] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<number | null>(null);
  const [selectedPrepTime, setSelectedPrepTime] = useState(20);

  const acceptedOrders = recentOrders.filter((o) => o.status === "accepted");
  const readyOrders = recentOrders.filter((o) => o.status === "ready");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  const handleAccept = async (id: number) => {
    setAcceptDialog(id);
  };

  const confirmAccept = async () => {
    if (acceptDialog == null) return;
    await acceptSingleOrder(acceptDialog);
    invalidate();
    setAcceptDialog(null);
    toast({ title: "Commande acceptée", description: `Temps de préparation : ${selectedPrepTime} min` });
  };

  const handleReject = (id: number) => {
    setRejectDialog(id);
  };

  const confirmReject = async () => {
    if (rejectDialog == null) return;
    await rejectSingleOrder(rejectDialog);
    invalidate();
    setRejectDialog(null);
    toast({ title: "Commande refusée", variant: "destructive" });
  };

  const handleReady = async (id: number) => {
    await markReady.mutateAsync({ id });
    invalidate();
    toast({ title: "Commande prête", description: "Le livreur peut venir la chercher." });
  };

  const handleSimulate = async () => {
    const rand = Math.floor(Math.random() * 9000) + 1000;
    await createOrder.mutateAsync({
      data: {
        orderNumber: `TEST-${rand}`,
        platform: "Bridge Eats",
        customerName: "Client Test",
        customerPhone: "+33 6 00 00 00 00",
        items: [
          { name: "Burger Bridge", quantity: 2, price: 14.5 },
          { name: "Frites", quantity: 2, price: 3.5 },
        ],
        totalAmount: 36.0,
        estimatedPrepTime: 20,
        deliveryAddress: "12 rue de Rivoli, Paris",
        notes: "Commande de test — sans pickles",
      },
    });
    invalidate();
    toast({ title: "Commande simulée envoyée", description: "Une nouvelle commande Bridge Eats a été créée." });
  };

  const prepTimes = [10, 15, 20, 25, 30];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-600">En direct</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulate}
            disabled={createOrder.isPending}
            data-testid="btn-simulate-order"
            className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <Zap size={14} />
            Simuler une commande
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Commandes aujourd'hui"
                value={stats?.totalToday ?? 0}
                icon={ShoppingBag}
                color="blue"
              />
              <StatCard
                label="En attente"
                value={pendingOrders.length}
                icon={Clock}
                color="orange"
              />
              <StatCard
                label="Chiffre du jour"
                value={formatCurrency(stats?.totalRevenue ?? 0)}
                icon={Euro}
                color="green"
              />
              <StatCard
                label="Délai moyen"
                value={stats?.avgPrepTime ? `${Math.round(stats.avgPrepTime)} min` : "—"}
                icon={Timer}
                color="purple"
              />
            </>
          )}
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 320px)" }}>
          <StatusKanban
            status="pending"
            label="Nouvelles"
            color="orange"
            count={pendingOrders.length}
          >
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <CheckCircle size={32} className="mb-2 text-emerald-300" />
                <p className="text-sm">Aucune commande en attente</p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))
            )}
          </StatusKanban>

          <StatusKanban
            status="accepted"
            label="En cuisine"
            color="blue"
            count={ordersLoading ? 0 : acceptedOrders.length}
          >
            {ordersLoading
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
              : acceptedOrders.length === 0
              ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <ChefHat size={32} className="mb-2 text-blue-200" />
                  <p className="text-sm">Aucune commande en cuisine</p>
                </div>
              )
              : acceptedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onReady={handleReady}
                />
              ))}
          </StatusKanban>

          <StatusKanban
            status="ready"
            label="Pretes a partir"
            color="green"
            count={ordersLoading ? 0 : readyOrders.length}
          >
            {ordersLoading
              ? Array.from({ length: 1 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              : readyOrders.length === 0
              ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <ShoppingBag size={32} className="mb-2 text-emerald-200" />
                  <p className="text-sm">Rien pour l'instant</p>
                </div>
              )
              : readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
          </StatusKanban>
        </div>
      </div>

      {/* Accept Dialog */}
      <Dialog open={acceptDialog !== null} onOpenChange={() => setAcceptDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accepter la commande</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">Quel est le temps de preparation ?</p>
          <div className="grid grid-cols-5 gap-2">
            {prepTimes.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedPrepTime(t)}
                data-testid={`prep-time-${t}`}
                className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  selectedPrepTime === t
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 text-gray-600 hover:border-orange-300"
                }`}
              >
                {t} min
              </button>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAcceptDialog(null)}>
              Annuler
            </Button>
            <Button
              onClick={confirmAccept}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="btn-confirm-accept"
            >
              <CheckCircle size={16} className="mr-2" /> Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog !== null} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la commande</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Etes-vous sur de vouloir refuser cette commande ?</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              data-testid="btn-confirm-reject"
            >
              <XCircle size={16} className="mr-2" /> Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
