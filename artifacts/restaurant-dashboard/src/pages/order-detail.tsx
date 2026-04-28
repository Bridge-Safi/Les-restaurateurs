import { useParams, Link } from "wouter";
import { useGetOrder, useMarkOrderReady } from "@workspace/api-client-react";
import { formatDateTime, formatCurrency } from "@/lib/formatters";
import { PlatformBadge } from "./dashboard";
import { StatusBadge } from "./orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, Check, X, ChefHat } from "lucide-react";
import { useAlarm } from "@/contexts/AlarmContext";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: ['/api/orders', orderId] } });
  const { acceptSingleOrder, rejectSingleOrder } = useAlarm();
  const markReady = useMarkOrderReady();

  if (isLoading) return <div className="p-8 text-center">Chargement...</div>;
  if (!order) return <div className="p-8 text-center">Commande introuvable.</div>;

  const isPending = order.status === "pending";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à l'historique
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-bold tracking-tight">Commande #{order.orderNumber}</h1>
          <PlatformBadge platform={order.platform} />
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <Clock className="w-5 h-5" />
          {formatDateTime(order.createdAt)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border bg-secondary/30 pb-4">
              <CardTitle>Détail de la commande</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {order.items.map((item, idx) => (
                  <li key={idx} className="p-6 flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center font-bold text-primary">
                        {item.quantity}x
                      </div>
                      <div>
                        <p className="font-bold text-lg">{item.name}</p>
                        {item.notes && <p className="text-sm text-red-600 mt-1 font-medium">⚠️ {item.notes}</p>}
                      </div>
                    </div>
                    <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>
              <div className="p-6 bg-secondary/30 border-t border-border">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {isPending && (
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-14 text-lg font-bold" 
                onClick={() => rejectSingleOrder(order.id)}
                data-testid="detail-reject"
              >
                <X className="w-5 h-5 mr-2" />
                Refuser la commande
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-bold" 
                onClick={() => acceptSingleOrder(order.id)}
                data-testid="detail-accept"
              >
                <Check className="w-5 h-5 mr-2" />
                Accepter la commande
              </Button>
            </div>
          )}
          {order.status === "accepted" && (
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-14 text-lg font-bold" 
              onClick={() => markReady.mutate({ id: order.id })}
              data-testid="detail-ready"
            >
              <ChefHat className="w-5 h-5 mr-2" />
              Marquer prête à partir
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-secondary/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" /> Client
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Nom</p>
                <p className="font-bold text-base">{order.customerName}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <p className="text-muted-foreground mb-1">Téléphone</p>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {order.notes && (
            <Card className="shadow-sm border-orange-200 bg-orange-50">
              <CardHeader className="pb-3 border-b border-orange-200">
                <CardTitle className="text-lg text-orange-800">Notes de la commande</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="font-medium text-orange-900">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
