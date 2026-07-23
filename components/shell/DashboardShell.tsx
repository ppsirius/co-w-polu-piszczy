"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { NAV_ITEMS } from "@/lib/navigation";
import { useUIStore } from "@/lib/store";
import { TODAY } from "@/lib/mock/data";
import { todayIso } from "@/lib/utils/today";

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
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const setToday = useUIStore((s) => s.setToday);
  const selectedDate = useUIStore((s) => s.selectedDate);

  // Lift "today" off the frozen mock default to the real clock date, once on
  // mount. Done here - the shell wraps every (dashboard) page - so there's a
  // single hydration boundary for "today" (mirrors the skipHydration pattern in
  // the persisted stores: the store ships with the SSR-safe TODAY, then the
  // client reconciles). Also nudges selectedDate forward if the user hasn't
  // touched it yet (still on the default), so live providers query current
  // data instead of last month's.
  useEffect(() => {
    const realToday = todayIso();
    setToday(realToday);
    if (selectedDate === TODAY) setSelectedDate(realToday);
    // selectedDate intentionally excluded - we only want to nudge the DEFAULT,
    // not clobber a user choice; re-running when it changes would fight the
    // user's picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setToday, setSelectedDate]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar title={titleFor(pathname)} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-surface-1">
          {children}
        </main>
      </div>
    </div>
  );
}
