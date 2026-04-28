import { useParams, Link } from "wouter";
import { useGetOrder, useAcceptOrder, useRejectOrder, useMarkOrderReady, getListOrdersQueryKey, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformBadge } from "@/components/PlatformBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatCurrency } from "@/lib/formatters";
import { ArrowLeft, Check, X, Package, Clock, User, MapPin, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const orderId = Number(id);

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId } });
  
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const markReady = useMarkOrderReady();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
  };

  const handleAccept = async () => {
    await acceptOrder.mutateAsync({ id: orderId });
    invalidateQueries();
  };

  const handleReject = async () => {
    await rejectOrder.mutateAsync({ id: orderId, data: { reason: "Refusé par le manager" } });
    invalidateQueries();
  };

  const handleReady = async () => {
    await markReady.mutateAsync({ id: orderId });
    invalidateQueries();
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!order) {
    return <div className="p-8 text-center">Commande introuvable</div>;
  }

  const isPending = order.status === "pending";
  const isAccepted = order.status === "accepted";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <Link href="/">
        <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour au dashboard
        </Button>
      </Link>

      {/* Header Banner */}
      <div className="bg-card border border-border p-6 rounded-lg flex items-start justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-black text-primary">#{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Reçu le {formatDateTime(order.createdAt)}
          </p>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[200px]">
          {isPending && (
            <>
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 text-lg" onClick={handleAccept} disabled={acceptOrder.isPending}>
                <Check className="w-5 h-5 mr-2" /> ACCEPTER
              </Button>
              <Button size="lg" variant="destructive" className="w-full font-bold h-14 text-lg" onClick={handleReject} disabled={rejectOrder.isPending}>
                <X className="w-5 h-5 mr-2" /> REFUSER
              </Button>
            </>
          )}
          {isAccepted && (
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 text-lg" onClick={handleReady} disabled={markReady.isPending}>
              <Package className="w-5 h-5 mr-2" /> MARQUER PRÊT
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Col: Items */}
        <div className="col-span-2 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="uppercase tracking-widest font-bold text-muted-foreground">Articles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {order.items.map((item, i) => (
                  <div key={i} className="p-4 flex items-start justify-between hover:bg-muted/20 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                        {item.quantity}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        {item.notes && (
                          <p className="text-amber-500 text-sm mt-1 flex items-start gap-1 font-mono">
                            <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="font-bold font-mono text-lg">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-muted/30 border-t border-border/50 flex justify-between items-center">
                <span className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Total à régler</span>
                <span className="text-3xl font-black text-primary">{formatCurrency(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
          
          {order.notes && (
            <Card className="border-amber-500/30 bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-500 uppercase tracking-widest flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" /> Note globale de commande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-lg">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Col: Info */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="uppercase tracking-widest font-bold text-muted-foreground">Informations</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Plateforme</p>
                <PlatformBadge platform={order.platform} />
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{order.customerName}</p>
                    {order.customerPhone && <p className="font-mono text-sm text-muted-foreground">{order.customerPhone}</p>}
                  </div>
                </div>
              </div>

              {order.deliveryAddress && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Adresse de livraison</p>
                  <div className="flex items-start gap-2 bg-muted/30 p-3 rounded-md border border-border/50">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="font-mono text-sm">{order.deliveryAddress}</p>
                  </div>
                </div>
              )}

              {(order.deliveryPersonName || order.deliveryPersonPhone) && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Livreur assigné</p>
                  <p className="font-bold">{order.deliveryPersonName || 'Non assigné'}</p>
                  {order.deliveryPersonPhone && <p className="font-mono text-sm text-muted-foreground">{order.deliveryPersonPhone}</p>}
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
