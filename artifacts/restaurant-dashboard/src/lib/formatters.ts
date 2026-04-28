import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } catch (e) {
    return 'inconnu';
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy HH:mm', { locale: fr });
  } catch (e) {
    return dateString;
  }
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
}
