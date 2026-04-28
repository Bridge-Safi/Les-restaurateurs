import { useState } from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { formatCurrency, formatTimeAgo, formatDateTime } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, PackageSearch } from "lucide-react";

const TABS = [
  { key: "", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "accepted", label: "En cuisine" },
  { key: "ready", label: "Prêtes" },
  { key: "picked_up", label: "Livrées" },
  { key: "rejected", label: "Refusées" },
];

const STATUS_LABEL: Record<string, string> = {
  pending:   "En attente",
  accepted:  "En cuisine",
  ready:     "Prête",
  picked_up: "Livrée",
  rejected:  "Refusée",
};

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-orange-100 text-orange-700",
  accepted:  "bg-blue-100 text-blue-700",
  ready:     "bg-emerald-100 text-emerald-700",
  picked_up: "bg-gray-100 text-gray-600",
  rejected:  "bg-red-100 text-red-600",
};

const PLATFORM_STYLE: Record<string, string> = {
  "Bridge Eats": "bg-[#FF6B35] text-white",
  "Uber Eats":   "bg-gray-900 text-white",
  "Deliveroo":   "bg-[#00CDBC] text-white",
  "Just Eat":    "bg-[#FF8000] text-white",
};

export default function Orders() {
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useListOrders(
    tab ? { status: tab } : {},
    { query: { refetchInterval: 5000 } }
  );

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.platform.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 pt-5 pb-0">
        <h1 className="font-bold text-gray-900 text-lg mb-4">Historique des commandes</h1>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`tab-status-${t.key || "all"}`}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                tab === t.key
                  ? "border-[#FF6B35] text-[#FF6B35]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro, client ou plateforme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white text-sm"
            data-testid="input-search-orders"
          />
        </div>

        {/* Table header */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-[1fr_120px_90px_80px_24px] gap-4 px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            <span>Commande</span>
            <span>Plateforme</span>
            <span>Statut</span>
            <span className="text-right">Total</span>
            <span />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <PackageSearch size={48} className="mb-3" />
            <p className="text-sm font-medium text-gray-400">Aucune commande trouvée</p>
            <p className="text-xs text-gray-300 mt-1">Essayez de changer les filtres ou la recherche</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div
                  data-testid={`order-row-${order.id}`}
                  className="grid grid-cols-[1fr_120px_90px_80px_24px] gap-4 items-center bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group"
                >
                  {/* Order info */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                    </div>
                    <p className="text-xs text-gray-500">{order.customerName} · {order.items.length} article{order.items.length > 1 ? "s" : ""} · {formatTimeAgo(order.createdAt)}</p>
                  </div>

                  {/* Platform */}
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${PLATFORM_STYLE[order.platform] ?? "bg-gray-200 text-gray-700"}`}>
                      {order.platform}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>

                  {/* Total */}
                  <p className="font-bold text-gray-900 text-sm text-right">{formatCurrency(order.totalAmount)}</p>

                  {/* Arrow */}
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
