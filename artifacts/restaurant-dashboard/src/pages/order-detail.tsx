import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrder,
  useAcceptOrder,
  useRejectOrder,
  useMarkOrderReady,
  getGetOrderQueryKey,
  getGetOrderStatsQueryKey,
  getGetRecentOrdersQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDateTime, formatTimeAgo } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChefHat,
  Phone,
  MapPin,
  User,
  Clock,
  Package,
  StickyNote,
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>
      {platform}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-orange-100 text-orange-700" },
    accepted: { label: "En cuisine", cls: "bg-blue-100 text-blue-700" },
    ready: { label: "Prete", cls: "bg-emerald-100 text-emerald-700" },
    picked_up: { label: "Livree", cls: "bg-gray-100 text-gray-600" },
    rejected: { label: "Refusee", cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>
      {label}
    </span>
  );
}

const TIMELINE_STEPS = [
  { key: "pending", label: "Commande recue" },
  { key: "accepted", label: "Acceptee" },
  { key: "ready", label: "Prete" },
  { key: "picked_up", label: "Livree" },
];

const STATUS_ORDER = ["pending", "accepted", "ready", "picked_up"];

export default function OrderDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const { data: order, isLoading } = useGetOrder(id, {
    query: { queryKey: getGetOrderQueryKey(id), refetchInterval: 5000, enabled: !isNaN(id) },
  });

  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const markReady = useMarkOrderReady();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  const handleAccept = async () => {
    await acceptOrder.mutateAsync({ id, data: { estimatedPrepTime: 20 } });
    invalidate();
    toast({ title: "Commande acceptee" });
  };

  const handleReject = async () => {
    await rejectOrder.mutateAsync({ id, data: { reason: "Refusee par le restaurant" } });
    invalidate();
    toast({ title: "Commande refusee", variant: "destructive" });
  };

  const handleReady = async () => {
    await markReady.mutateAsync({ id });
    invalidate();
    toast({ title: "Commande prete", description: "Le livreur peut venir." });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center text-gray-500">Commande introuvable.</div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/orders")}
          data-testid="btn-back"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">#{order.orderNumber}</h1>
            <PlatformBadge platform={order.platform} />
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Recue {formatTimeAgo(order.createdAt)} — {formatDateTime(order.createdAt)}
          </p>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          {order.status === "pending" && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={rejectOrder.isPending}
                data-testid="btn-reject-detail"
              >
                <XCircle size={15} className="mr-1.5" /> Refuser
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={acceptOrder.isPending}
                data-testid="btn-accept-detail"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <CheckCircle size={15} className="mr-1.5" /> Accepter
              </Button>
            </>
          )}
          {order.status === "accepted" && (
            <Button
              size="sm"
              onClick={handleReady}
              disabled={markReady.isPending}
              data-testid="btn-ready-detail"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <ChefHat size={15} className="mr-1.5" /> Marquer prete
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Timeline */}
          {order.status !== "rejected" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Suivi
              </h2>
              <div className="flex items-center gap-0">
                {TIMELINE_STEPS.map((step, i) => {
                  const isActive = i === currentStepIndex;
                  const isDone = i < currentStepIndex;
                  return (
                    <div key={step.key} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          isDone ? "bg-emerald-500 text-white"
                          : isActive ? "bg-orange-500 text-white ring-4 ring-orange-100"
                          : "bg-gray-100 text-gray-400"
                        }`}>
                          {isDone ? <CheckCircle size={16} /> : i + 1}
                        </div>
                        <span className={`text-xs mt-1.5 font-medium text-center leading-tight ${
                          isActive ? "text-orange-600" : isDone ? "text-emerald-600" : "text-gray-400"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 rounded-full ${isDone ? "bg-emerald-400" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {order.status === "rejected" && order.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Commande refusee</p>
              <p className="text-sm text-red-600">{order.rejectionReason}</p>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package size={15} /> Articles ({order.items.length})
            </h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-100 text-orange-700 font-bold text-sm w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.quantity}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 flex-shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Delivery */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User size={15} /> Client
              </h2>
              <p className="font-semibold text-gray-900">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                  <Phone size={13} /> {order.customerPhone}
                </p>
              )}
              {order.deliveryAddress && (
                <p className="text-sm text-gray-600 flex items-start gap-1.5 mt-1">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  {order.deliveryAddress}
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={15} /> Timing
              </h2>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Recue</span>
                  <span className="text-gray-900 font-medium">{formatDateTime(order.createdAt)}</span>
                </div>
                {order.acceptedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Acceptee</span>
                    <span className="text-gray-900 font-medium">{formatDateTime(order.acceptedAt)}</span>
                  </div>
                )}
                {order.readyAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prete</span>
                    <span className="text-gray-900 font-medium">{formatDateTime(order.readyAt)}</span>
                  </div>
                )}
                {order.estimatedPrepTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prep estimee</span>
                    <span className="text-gray-900 font-medium">{order.estimatedPrepTime} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-yellow-700 flex items-center gap-2 mb-1">
                <StickyNote size={15} /> Note du client
              </h2>
              <p className="text-sm text-yellow-800">{order.notes}</p>
            </div>
          )}

          {/* Delivery person */}
          {order.deliveryPersonName && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Livreur
              </h2>
              <p className="font-semibold text-gray-900">{order.deliveryPersonName}</p>
              {order.deliveryPersonPhone && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                  <Phone size={13} /> {order.deliveryPersonPhone}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
