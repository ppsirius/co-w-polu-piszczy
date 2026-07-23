import {
  ChartLineUp,
  CellTower,
  MapTrifold,
  ArrowsClockwise,
  Sparkle,
  SquaresFour,
  Users,
} from "@phosphor-icons/react";

/** A Phosphor icon is a forward-ref component accepting IconProps. */
export type NavIcon = React.ForwardRefExoticComponent<
  import("@phosphor-icons/react").IconProps
>;

export type NavItem = {
  /** Path under the (dashboard) route group. */
  href: string;
  label: string;
  icon: NavIcon;
};

/**
 * Sidebar modules (brief §2.A). One Phosphor icon per module.
 * The icon field holds a Phosphor component; the Icon wrapper renders it.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Panel główny", icon: ChartLineUp },
  { href: "/sensors", label: "Czujniki", icon: CellTower },
  { href: "/map", label: "Mapa", icon: MapTrifold },
  { href: "/crop-rotation", label: "Płodozmian", icon: ArrowsClockwise },
  { href: "/ai-assessment", label: "Ocena pól AI", icon: Sparkle },
  { href: "/field-management", label: "Zarządzanie polami", icon: SquaresFour },
  { href: "/members", label: "Członkowie", icon: Users },
];
