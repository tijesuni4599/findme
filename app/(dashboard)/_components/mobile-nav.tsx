"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Link as LinkIcon, Menu, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard/links", label: "Links", icon: LinkIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/appearance", label: "Appearance", icon: Palette },
];

const moreRoutes = [
  "/dashboard/domain",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/more",
];

export function MobileNav() {
  const pathname = usePathname();

  const isMoreActive = moreRoutes.some((r) => pathname.startsWith(r));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      {mainNav.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon
              className={cn("h-5 w-5", active && "stroke-[2.5px]")}
            />
            {item.label}
          </Link>
        );
      })}

      {/* More */}
      <Link
        href="/dashboard/more"
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
          isMoreActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Menu className={cn("h-5 w-5", isMoreActive && "stroke-[2.5px]")} />
        More
      </Link>
    </nav>
  );
}
