import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CreditCard, Globe, Settings } from "lucide-react";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { APP_DOMAIN } from "@/lib/constants";
import { SignOutButton } from "@/app/(dashboard)/_components/signout-button";

export const metadata: Metadata = { title: "More" };

const sections = [
  {
    label: "Manage",
    items: [
      {
        href: "/dashboard/domain",
        icon: Globe,
        label: "Domain",
        description: "Connect a custom domain",
      },
      {
        href: "/dashboard/billing",
        icon: CreditCard,
        label: "Billing",
        description: "Plan and payment details",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/settings",
        icon: Settings,
        label: "Settings",
        description: "Profile and preferences",
      },
    ],
  },
];

export default async function MorePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, plan")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name?.trim() ??
    profile?.username ??
    user.email?.split("@")[0] ??
    "You";

  const initial =
    displayName.charAt(0) ??
    profile?.username?.charAt(0) ??
    user.email?.charAt(0) ??
    "?";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">More</h1>

      {/* Profile card */}
      <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 ring-1 ring-border/60">
        <Avatar className="h-12 w-12">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          ) : null}
          <AvatarFallback className="text-base">
            {initial.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {APP_DOMAIN}/{profile?.username ?? ""}
          </p>
        </div>
        <Badge variant={profile?.plan === "pro" ? "default" : "outline"}>
          {profile?.plan === "pro" ? "Pro" : "Free"}
        </Badge>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {section.label}
          </p>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
            {section.items.map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60 ${
                  idx !== 0 ? "border-t border-border/60" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Sign out */}
      <div className="overflow-hidden rounded-xl border border-destructive/30 bg-background">
        <div className="flex items-center justify-between px-4 py-3.5">
          <p className="text-sm font-medium text-destructive">Sign out</p>
          <SignOutButton variant="destructive" />
        </div>
      </div>
    </div>
  );
}
