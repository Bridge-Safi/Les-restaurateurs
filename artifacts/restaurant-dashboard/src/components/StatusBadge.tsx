import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50 uppercase tracking-widest animate-pulse">En attente</Badge>;
    case "accepted":
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50 uppercase tracking-widest">En cours</Badge>;
    case "ready":
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/50 uppercase tracking-widest">Prêt</Badge>;
    case "picked_up":
      return <Badge className="bg-muted text-muted-foreground uppercase tracking-widest">Récupéré</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/20 text-destructive border-destructive/50 uppercase tracking-widest">Refusé</Badge>;
    default:
      return <Badge variant="outline" className="uppercase tracking-widest">{status}</Badge>;
  }
}
