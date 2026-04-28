import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'dd MMM yyyy à HH:mm', { locale: fr });
}
