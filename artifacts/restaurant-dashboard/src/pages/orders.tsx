import { useState } from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatCurrency, formatTimeAgo, formatDateTime } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, PackageSearch } from "lucide-react";

const STATUSES = [
  { key: "", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "accepted", label: "En cuisine" },
  { key: "ready", label: "Pretes" },
  { key: "picked_up", label: "Livrees" },
  { key: "rejected", label: "Refusees" },
];

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700 border-orange-200",
    accepted: "bg-blue-100 text-blue-700 border-blue-200",
    ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
    picked_up: "bg-gray-100 text-gray-600 border-gray-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    pending: "En attente",
    accepted: "En cuisine",
    ready: "Prete",
    picked_up: "Livree",
    rejected: "Refusee",
  };
  const cls = variants[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

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

export default function Orders() {
  const [activeStatus, setActiveStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useListOrders(
    activeStatus ? { status: activeStatus } : {},
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
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Historique des commandes</h1>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveStatus(s.key)}
              data-testid={`tab-status-${s.key || "all"}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeStatus === s.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher par numero, client ou plateforme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
            data-testid="input-search-orders"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <PackageSearch size={48} className="mb-3 text-gray-200" />
            <p className="text-base font-medium">Aucune commande trouvee</p>
            <p className="text-sm">Essayez de changer les filtres</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div
                  data-testid={`order-row-${order.id}`}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                      <PlatformBadge platform={order.platform} />
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items.length} article{order.items.length > 1 ? "s" : ""} — {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-xs text-gray-400">{formatTimeAgo(order.createdAt)}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
