import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatTimeAgo(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale: fr,
  });
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), "dd MMM yyyy à HH:mm", {
    locale: fr,
  });
}

export function formatTime(dateString: string): string {
  return format(new Date(dateString), "HH:mm", {
    locale: fr,
  });
}
