"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type Period = "today" | "7d" | "30d";

const tabs: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

export function PeriodTabs({ current }: { current: Period }) {
  return (
    <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:w-fit sm:flex">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={`/dashboard/analytics?period=${tab.value}`}
          className={cn(
            "rounded-lg px-5 py-2 text-center text-sm font-medium transition-colors duration-150",
            current === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
