/**
 * service-types.ts — types de commerce supportés par le tableau de bord.
 *
 * Un seul tableau de bord ("Les-restaurateurs") sert desormais tous les
 * commerces Bridge Safi qui recoivent des commandes a preparer (Restaurant,
 * Tabac, Pharmacie, Fleurs, Boulangerie, Souk). Taxi et Supermarche sont
 * volontairement exclus : Taxi n'a pas de "commerce" a proprement parler
 * (juste des chauffeurs), et Supermarche est gere separement (grandes
 * enseignes, catalogue different).
 *
 * Le fonctionnement (accepter/refuser, temps de preparation, prete, suivi)
 * reste identique pour tous - seul le libelle/l'icone changent.
 */

export type ServiceType =
  | "restaurant"
  | "tabac"
  | "pharmacie"
  | "fleurs"
  | "boulangerie"
  | "souk";

export interface ServiceTypeConfig {
  key: ServiceType;
  label: string;
  /** Utilise pour le champ "Nom de votre ..." a l'inscription */
  nameLabel: string;
  emoji: string;
}

export const SERVICE_TYPES: ServiceTypeConfig[] = [
  { key: "restaurant",  label: "Restaurant",  nameLabel: "Nom du restaurant",   emoji: "\u{1F354}" },
  { key: "tabac",       label: "Tabac",       nameLabel: "Nom du tabac",        emoji: "\u{1F6AC}" },
  { key: "pharmacie",   label: "Pharmacie",   nameLabel: "Nom de la pharmacie", emoji: "\u{1F48A}" },
  { key: "fleurs",      label: "Fleurs",      nameLabel: "Nom du fleuriste",    emoji: "\u{1F490}" },
  { key: "boulangerie", label: "Boulangerie", nameLabel: "Nom de la boulangerie", emoji: "\u{1F950}" },
  { key: "souk",        label: "Souk",        nameLabel: "Nom du commerce",     emoji: "\u{1F9FA}" },
];

export function getServiceTypeConfig(key?: string | null): ServiceTypeConfig {
  return SERVICE_TYPES.find((s) => s.key === key) ?? SERVICE_TYPES[0];
}
