"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "@phosphor-icons/react";
import { NAV_ITEMS } from "@/lib/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * Left navigation rail (brief §2.A). 256px wide, surface-1 background,
 * active item in teal. Fixed height scroll for the module list.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface-1">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
          <Icon icon={Leaf} size={22} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-ink">Cowpolupiszczy</span>
          <span className="text-xs text-ink-muted">Monitoring pól</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Główna nawigacja">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon
                    icon={item.icon}
                    size={20}
                    className={isActive ? "text-primary" : "text-ink-subtle"}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-ink-subtle">MVP · dane demonstracyjne</p>
      </div>
    </aside>
  );
}
