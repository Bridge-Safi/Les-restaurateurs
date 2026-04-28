import React from "react";
import { Link } from "wouter";
import type { Order } from "@workspace/api-client-react/src/generated/api.schemas";
import { useAcceptOrder, useRejectOrder, useMarkOrderReady } from "@workspace/api-client-react";
import { PlatformBadge } from "./PlatformBadge";
import { StatusBadge } from "./StatusBadge";
import { formatTimeAgo, formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, Check, X, Package, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrdersQueryKey, getGetOrderStatsQueryKey, getGetRecentOrdersQueryKey } from "@workspace/api-client-react";

export function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const markReady = useMarkOrderReady();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault();
    await acceptOrder.mutateAsync({ id: order.id });
    invalidateQueries();
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.preventDefault();
    await rejectOrder.mutateAsync({ id: order.id, data: { reason: "Refusé depuis le dashboard" } });
    invalidateQueries();
  };

  const handleReady = async (e: React.MouseEvent) => {
    e.preventDefault();
    await markReady.mutateAsync({ id: order.id });
    invalidateQueries();
  };

  const isPending = order.status === "pending";
  const isAccepted = order.status === "accepted";
  const isReady = order.status === "ready";

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className={`cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden ${isPending ? 'border-amber-500/50 bg-amber-950/10' : 'border-border'}`}>
        {isPending && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />}
        {isAccepted && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />}
        {isReady && <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />}

        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div>
            <div className="text-2xl font-black tracking-tight flex items-center gap-2">
              #{order.orderNumber}
            </div>
            <div className="text-sm text-muted-foreground font-semibold mt-1">
              {order.customerName}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PlatformBadge platform={order.platform} />
            <StatusBadge status={order.status} />
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-2">
          <div className="flex items-center text-xs text-muted-foreground font-bold bg-muted/50 w-fit px-2 py-1 rounded-md mb-4">
            <Clock className="w-3 h-3 mr-1" />
            Reçu {formatTimeAgo(order.createdAt)}
          </div>
          
          <div className="space-y-1 mb-4">
            {order.items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-medium truncate mr-2"><span className="text-primary font-bold">{item.quantity}x</span> {item.name}</span>
              </div>
            ))}
            {order.items.length > 2 && (
              <div className="text-xs text-muted-foreground italic">
                + {order.items.length - 2} autre(s) article(s)
              </div>
            )}
          </div>
          
          <div className="flex items-end justify-between border-t border-border/50 pt-3 mt-3">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total</div>
            <div className="text-xl font-black text-primary">{formatCurrency(order.totalAmount)}</div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 gap-2 z-10 relative">
          {isPending && (
            <>
              <Button 
                variant="destructive" 
                className="w-1/3 font-bold h-12 text-lg" 
                onClick={handleReject}
                disabled={rejectOrder.isPending}
              >
                <X className="w-6 h-6" />
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-lg" 
                onClick={handleAccept}
                disabled={acceptOrder.isPending}
              >
                <Check className="w-5 h-5 mr-2" /> ACCEPTER
              </Button>
            </>
          )}
          {isAccepted && (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-lg" 
              onClick={handleReady}
              disabled={markReady.isPending}
            >
              <Package className="w-5 h-5 mr-2" /> MARQUER PRÊT
            </Button>
          )}
          {!isPending && !isAccepted && (
            <Button variant="secondary" className="w-full h-12 font-bold uppercase tracking-widest text-muted-foreground">
              Détails <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
