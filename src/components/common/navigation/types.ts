import { ReactNode } from "react";

/** Colour of a sidebar count badge. Maps onto the `Badge` variant of the same name. */
export type NavBadgeVariant = "primary" | "warning";

/**
 * A single sidebar navigation entry. The chrome (`SideBar`/`SideBarBox`) is
 * purely presentational — each audience (families, coach) builds its own
 * `NavItem[]` and supplies live badge counts from its own provider.
 */
export type NavItem = {
  id: number;
  name: string;
  link: string;
  icon: ReactNode;
  /** Count shown as a circular badge. Hidden when undefined or 0. */
  badge?: number;
  /** Badge colour (default "primary" = mint). Use "warning" for coral. */
  badgeVariant?: NavBadgeVariant;
};
