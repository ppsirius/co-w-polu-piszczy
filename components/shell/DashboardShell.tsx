"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { NAV_ITEMS } from "@/lib/navigation";

/** Maps the current pathname to the matching nav label for the TopBar title. */
function titleFor(pathname: string): string {
  const match = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
  if (match) return match.label;
  // Sensor inspection deep link.
  if (pathname.startsWith("/sensor/")) return "Inspekcja czujnika";
  return "Cowpolupiszczy";
}

/**
 * Dashboard chrome: fixed Sidebar (256px) + main column with a 56px TopBar
 * and the page body. Pages render inside {children}.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={titleFor(pathname)} />
        <main className="flex-1 overflow-y-auto bg-surface-1">{children}</main>
      </div>
    </div>
  );
}
