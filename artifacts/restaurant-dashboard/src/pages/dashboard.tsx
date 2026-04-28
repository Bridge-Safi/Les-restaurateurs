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
  Zap,
  MapPin,
  StickyNote,
  AlertCircle,
} from "lucide-react";

/* ── Platform badge ── */
function Platform({ name }: { name: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    "Bridge Eats": { bg: "#FF6B35", text: "#fff" },
    "Uber Eats":   { bg: "#000",    text: "#fff" },
    "Deliveroo":   { bg: "#00CDBC", text: "#fff" },
    "Just Eat":    { bg: "#FF8000", text: "#fff" },
  };
  const s = map[name] ?? { bg: "#6B7280", text: "#fff" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {name}
    </span>
  );
}

/* ── Status column ── */
function Column({
  label, accent, count, children,
}: {
  label: string; accent: string; count: number; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex-1">{label}</span>
        <span
          className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          style={{ backgroundColor: accent + "22", color: accent }}
        >
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {children}
      </div>
    </div>
  );
}

/* ── Order card ── */
function Card({
  order,
  onAccept,
  onReject,
  onReady,
}: {
  order: Order;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  onReady?: (id: number) => void;
}) {
  const isPending = order.status === "pending";

  return (
    <div
      data-testid={`order-card-${order.id}`}
      className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${
        isPending
          ? "border-orange-200 bg-orange-50/40"
          : "border-gray-100 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
            <Platform name={order.platform} />
          </div>
          <p className="text-xs font-medium text-gray-600">{order.customerName}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900 text-sm">{formatCurrency(order.totalAmount)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatTimeAgo(order.createdAt)}</p>
        </div>
      </div>

      {/* Address */}
      {order.deliveryAddress && (
        <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-2">
          <MapPin size={10} className="flex-shrink-0" />
          {order.deliveryAddress}
        </p>
      )}

      {/* Items */}
      <div className="text-[11px] text-gray-600 space-y-0.5 mb-3">
        {order.items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex gap-1">
            <span className="font-bold text-gray-400 w-5 flex-shrink-0">{item.quantity}×</span>
            <span className="truncate">{item.name}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-gray-400 italic">+{order.items.length - 3} article(s)</p>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-3">
          <StickyNote size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-snug">{order.notes}</p>
        </div>
      )}

      {/* Prep time */}
      {order.estimatedPrepTime && order.status === "accepted" && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 mb-3">
          <Timer size={11} />
          Prêt dans ~{order.estimatedPrepTime} min
        </div>
      )}

      {/* Actions */}
      {isPending && onAccept && onReject && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onReject(order.id)}
            data-testid={`btn-reject-${order.id}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <XCircle size={13} /> Refuser
          </button>
          <button
            onClick={() => onAccept(order.id)}
            data-testid={`btn-accept-${order.id}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle size={13} /> Accepter
          </button>
        </div>
      )}

      {order.status === "accepted" && onReady && (
        <button
          onClick={() => onReady(order.id)}
          data-testid={`btn-ready-${order.id}`}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors mt-1"
        >
          <ChefHat size={13} /> Marquer comme prête
        </button>
      )}
    </div>
  );
}

/* ── Stat card ── */
function Stat({
  label, value, icon: Icon, accent, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; accent: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: accent + "18" }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Empty column ── */
function Empty({ icon: Icon, msg }: { icon: React.ElementType; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-28 text-gray-300 gap-2">
      <Icon size={28} />
      <p className="text-xs text-gray-400">{msg}</p>
    </div>
  );
}

/* ── Page ── */
export default function Dashboard() {
  const qc = useQueryClient();
  const { pendingOrders, acceptSingleOrder, rejectSingleOrder } = useAlarm();
  const { data: stats, isLoading: statsLoading } = useGetOrderStats();
  const { data: recentOrders = [], isLoading: ordersLoading } = useGetRecentOrders();
  const markReady = useMarkOrderReady();
  const createOrder = useCreateOrder();

  const [acceptId, setAcceptId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [prepTime, setPrepTime] = useState(20);

  const accepted = recentOrders.filter((o) => o.status === "accepted");
  const ready    = recentOrders.filter((o) => o.status === "ready");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  const confirmAccept = async () => {
    if (acceptId == null) return;
    await acceptSingleOrder(acceptId);
    invalidate();
    setAcceptId(null);
    toast({ title: "Commande acceptée", description: `Préparation : ${prepTime} min` });
  };

  const confirmReject = async () => {
    if (rejectId == null) return;
    await rejectSingleOrder(rejectId);
    invalidate();
    setRejectId(null);
    toast({ title: "Commande refusée", variant: "destructive" });
  };

  const handleReady = async (id: number) => {
    await markReady.mutateAsync({ id });
    invalidate();
    toast({ title: "Commande prête !" });
  };

  const handleSimulate = async () => {
    const n = Math.floor(Math.random() * 9000) + 1000;
    await createOrder.mutateAsync({
      data: {
        orderNumber: `TEST-${n}`,
        platform: "Bridge Eats",
        customerName: "Client Test",
        customerPhone: "+33 6 00 00 00 00",
        items: [
          { name: "Burger Bridge", quantity: 2, price: 14.5 },
          { name: "Frites maison", quantity: 2, price: 3.5 },
        ],
        totalAmount: 36.0,
        estimatedPrepTime: 20,
        deliveryAddress: "12 rue de Rivoli, 75001 Paris",
        notes: "Commande test — sans pickles",
      },
    });
    invalidate();
    toast({ title: "Commande simulée", description: "Une nouvelle commande a été créée." });
  };

  const PREP = [10, 15, 20, 25, 30];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between">
        <h1 className="font-bold text-gray-900 text-lg">Tableau de bord</h1>
        <button
          onClick={handleSimulate}
          disabled={createOrder.isPending}
          data-testid="btn-simulate-order"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <Zap size={14} className="text-[#FF6B35]" />
          Simuler une commande
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : (
            <>
              <Stat label="Commandes aujourd'hui" value={stats?.totalToday ?? 0} icon={ShoppingBag} accent="#3B82F6" />
              <Stat label="En attente" value={pendingOrders.length} icon={AlertCircle} accent="#FF6B35" />
              <Stat label="Chiffre du jour" value={formatCurrency(stats?.totalRevenue ?? 0)} icon={Euro} accent="#10B981" />
              <Stat
                label="Délai moyen"
                value={stats?.avgPrepTime ? `${Math.round(stats.avgPrepTime)} min` : "—"}
                icon={Timer}
                accent="#8B5CF6"
              />
            </>
          )}
        </div>

        {/* Kanban */}
        <div
          className="grid grid-cols-3 gap-4"
          style={{ height: "calc(100vh - 260px)" }}
        >
          <Column label="Nouvelles commandes" accent="#FF6B35" count={pendingOrders.length}>
            {pendingOrders.length === 0
              ? <Empty icon={CheckCircle} msg="Aucune commande en attente" />
              : pendingOrders.map((o) => (
                <Card key={o.id} order={o} onAccept={setAcceptId} onReject={setRejectId} />
              ))}
          </Column>

          <Column label="En cuisine" accent="#3B82F6" count={ordersLoading ? 0 : accepted.length}>
            {ordersLoading
              ? <Skeleton className="h-28 rounded-xl" />
              : accepted.length === 0
              ? <Empty icon={ChefHat} msg="Aucune commande en préparation" />
              : accepted.map((o) => <Card key={o.id} order={o} onReady={handleReady} />)}
          </Column>

          <Column label="Prêtes à partir" accent="#10B981" count={ordersLoading ? 0 : ready.length}>
            {ordersLoading
              ? <Skeleton className="h-24 rounded-xl" />
              : ready.length === 0
              ? <Empty icon={ShoppingBag} msg="Aucune commande prête" />
              : ready.map((o) => <Card key={o.id} order={o} />)}
          </Column>
        </div>
      </div>

      {/* Accept dialog */}
      <Dialog open={acceptId !== null} onOpenChange={() => setAcceptId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Accepter la commande</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mb-4">Choisissez le temps de préparation estimé :</p>
          <div className="grid grid-cols-5 gap-2">
            {PREP.map((t) => (
              <button
                key={t}
                onClick={() => setPrepTime(t)}
                data-testid={`prep-time-${t}`}
                className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${
                  prepTime === t
                    ? "border-[#FF6B35] bg-orange-50 text-orange-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {t} min
              </button>
            ))}
          </div>
          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setAcceptId(null)}>Annuler</Button>
            <Button
              onClick={confirmAccept}
              data-testid="btn-confirm-accept"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <CheckCircle size={15} className="mr-1.5" /> Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectId !== null} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Refuser la commande</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Êtes-vous sûr de vouloir refuser cette commande ? Le client en sera informé.</p>
          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setRejectId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              data-testid="btn-confirm-reject"
            >
              <XCircle size={15} className="mr-1.5" /> Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
