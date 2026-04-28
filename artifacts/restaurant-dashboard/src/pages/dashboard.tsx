import { useListOrders, useGetOrderStats, useMarkOrderReady } from "@workspace/api-client-react";
import { useAlarm } from "@/contexts/AlarmContext";
import { formatCurrency, formatTimeAgo } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, ChefHat, Clock, AlertCircle } from "lucide-react";
import type { Order } from "@workspace/api-client-react/src/generated/api.schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const { data: stats } = useGetOrderStats({ query: { refetchInterval: 3000 } });
  const { data: pendingOrders = [] } = useListOrders({ status: "pending" }, { query: { refetchInterval: 3000 } });
  const { data: acceptedOrders = [] } = useListOrders({ status: "accepted" }, { query: { refetchInterval: 3000 } });
  const { data: readyOrders = [] } = useListOrders({ status: "ready" }, { query: { refetchInterval: 3000 } });
  
  const { acceptSingleOrder, rejectSingleOrder } = useAlarm();
  const markReady = useMarkOrderReady();

  const [rejectingOrder, setRejectingOrder] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [acceptingOrder, setAcceptingOrder] = useState<number | null>(null);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="grid grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Aujourd'hui</p>
            <p className="text-3xl font-bold mt-2" data-testid="stat-total-today">{stats?.totalToday || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">En attente</p>
            <p className="text-3xl font-bold mt-2 text-orange-600" data-testid="stat-pending">{stats?.pendingCount || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Chiffre du jour</p>
            <p className="text-3xl font-bold mt-2" data-testid="stat-revenue">{formatCurrency(stats?.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Délai moyen</p>
            <p className="text-3xl font-bold mt-2" data-testid="stat-avg-time">{stats?.avgPrepTime || 0} min</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="flex flex-col bg-secondary/30 rounded-xl p-4 overflow-hidden border border-border">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            Nouvelles
            <Badge variant="secondary" className="bg-white">{pendingOrders.length}</Badge>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>Aucune commande en attente</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAccept={() => setAcceptingOrder(order.id)}
                  onReject={() => setRejectingOrder(order.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col bg-secondary/30 rounded-xl p-4 overflow-hidden border border-border">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            En cuisine
            <Badge variant="secondary" className="bg-white">{acceptedOrders.length}</Badge>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {acceptedOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onReady={() => markReady.mutate({ id: order.id })}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-secondary/30 rounded-xl p-4 overflow-hidden border border-border">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            Prêtes à partir
            <Badge variant="secondary" className="bg-white">{readyOrders.length}</Badge>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {readyOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      </div>

      {rejectingOrder && (
        <Dialog open={!!rejectingOrder} onOpenChange={() => setRejectingOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refuser la commande</DialogTitle>
              <DialogDescription>Êtes-vous sûr de vouloir refuser cette commande ?</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Raison (optionnelle)</Label>
                <Input 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)} 
                  placeholder="Ex: Plus de stock"
                  data-testid="input-reject-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingOrder(null)}>Annuler</Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  rejectSingleOrder(rejectingOrder);
                  setRejectingOrder(null);
                  setRejectReason("");
                }}
                data-testid="button-confirm-reject"
              >
                Confirmer le refus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {acceptingOrder && (
        <Dialog open={!!acceptingOrder} onOpenChange={() => setAcceptingOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accepter la commande</DialogTitle>
              <DialogDescription>Confirmez l'acceptation de la commande.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAcceptingOrder(null)}>Annuler</Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  acceptSingleOrder(acceptingOrder);
                  setAcceptingOrder(null);
                }}
                data-testid="button-confirm-accept"
              >
                Accepter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function OrderCard({ 
  order, 
  onAccept, 
  onReject, 
  onReady 
}: { 
  order: Order, 
  onAccept?: () => void, 
  onReject?: () => void,
  onReady?: () => void
}) {
  const isPending = order.status === "pending";
  
  return (
    <Card className={`shadow-sm transition-shadow hover:shadow-md ${isPending ? 'border-l-4 border-l-orange-500' : ''}`} data-testid={`card-order-${order.id}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-bold">#{order.orderNumber}</h3>
              <PlatformBadge platform={order.platform} />
            </div>
            <p className="font-medium">{order.customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{formatCurrency(order.totalAmount)}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end mt-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <p className="text-sm font-medium text-muted-foreground">{order.items.reduce((acc, item) => acc + item.quantity, 0)} articles</p>
          <ul className="text-sm space-y-1">
            {order.items.slice(0, 3).map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
              </li>
            ))}
            {order.items.length > 3 && (
              <li className="text-muted-foreground italic">...et {order.items.length - 3} autres</li>
            )}
          </ul>
        </div>

        <div className="flex gap-2">
          {isPending && onAccept && onReject && (
            <>
              <Button 
                variant="outline" 
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" 
                onClick={onReject}
                data-testid={`button-reject-${order.id}`}
              >
                <X className="w-4 h-4 mr-2" />
                Refuser
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                onClick={onAccept}
                data-testid={`button-accept-${order.id}`}
              >
                <Check className="w-4 h-4 mr-2" />
                Accepter
              </Button>
            </>
          )}
          {order.status === "accepted" && onReady && (
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={onReady}
              data-testid={`button-ready-${order.id}`}
            >
              <ChefHat className="w-4 h-4 mr-2" />
              Prête à partir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "uber eats" || p === "ubereats") {
    return <Badge className="bg-black text-white hover:bg-black/90 rounded-full px-3 py-0.5">Uber Eats</Badge>;
  }
  if (p === "deliveroo") {
    return <Badge className="bg-[#00CDBC] text-white hover:bg-[#00CDBC]/90 rounded-full px-3 py-0.5">Deliveroo</Badge>;
  }
  if (p === "just eat" || p === "justeat") {
    return <Badge className="bg-orange-500 text-white hover:bg-orange-600 rounded-full px-3 py-0.5">Just Eat</Badge>;
  }
  return <Badge variant="secondary" className="rounded-full px-3 py-0.5">{platform}</Badge>;
}
