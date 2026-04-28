import { useState } from "react";
import { useListOrders } from "@workspace/api-client-react";
import { formatDateTime, formatCurrency } from "@/lib/formatters";
import { PlatformBadge } from "./dashboard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: orders = [], isLoading } = useListOrders(statusFilter ? { status: statusFilter } : {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Historique des commandes</h1>
      </div>

      <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          {["Toutes", "pending", "accepted", "ready", "picked_up", "rejected"].map(s => {
            const isActive = s === "Toutes" ? statusFilter === undefined : statusFilter === s;
            const label = s === "Toutes" ? "Toutes" : 
                          s === "pending" ? "En attente" : 
                          s === "accepted" ? "En cuisine" : 
                          s === "ready" ? "Prêtes" : 
                          s === "picked_up" ? "Livrée" : "Refusée";
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s === "Toutes" ? undefined : s)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                data-testid={`filter-${s}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9 bg-secondary border-none rounded-full" />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Commande</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Plateforme</th>
              <th className="px-6 py-4 font-medium">Client</th>
              <th className="px-6 py-4 font-medium">Statut</th>
              <th className="px-6 py-4 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Chargement...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Aucune commande trouvée.</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/orders/${order.id}`} className="font-bold text-primary hover:underline">
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                  <td className="px-6 py-4"><PlatformBadge platform={order.platform} /></td>
                  <td className="px-6 py-4 font-medium">{order.customerName}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(order.totalAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-none">En attente</Badge>;
  if (status === "accepted") return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none">En cuisine</Badge>;
  if (status === "ready") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Prête</Badge>;
  if (status === "picked_up") return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none">Livrée</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Refusée</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
