import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Globe,
  Link as LinkIcon,
  Palette,
  Settings,
} from "lucide-react";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { APP_DOMAIN } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { SignOutButton } from "./_components/signout-button";

const nav = [
  { href: "/dashboard/links", label: "Links", icon: LinkIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/appearance", label: "Appearance", icon: Palette },
  { href: "/dashboard/domain", label: "Domain", icon: Globe },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen">
      {/* Fixed top bar */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-full items-center justify-between gap-4 px-8">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {profile?.username ? (
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {APP_DOMAIN}/{profile.username}
              </a>
            ) : null}
            <Avatar className="h-8 w-8">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback>{initial.toUpperCase()}</AvatarFallback>
            </Avatar>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Fixed sidebar */}
      <aside className="fixed bottom-0 left-0 top-14 hidden w-60 flex-col border-r border-border/60 bg-muted/30 md:flex">
        <div className="flex flex-1 flex-col overflow-y-auto p-3 pb-4">
          <div className="mb-3 rounded-xl bg-background/90 p-3 ring-1 ring-border/70">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={displayName} />
                ) : null}
                <AvatarFallback>{initial.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{profile?.username ?? "username"}
                </p>
              </div>
              <Badge variant={profile?.plan === "pro" ? "default" : "outline"}>
                {profile?.plan === "pro" ? "Pro" : "Free"}
              </Badge>
            </div>
          </div>

          <nav className="flex flex-col gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {profile?.username ? (
            <div className="mt-auto pt-3">
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5 text-sm font-medium ring-1 ring-border/70 transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-muted active:scale-[0.96]"
              >
                View my page
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Scrollable content offset by header + sidebar */}
      <div className="pt-14 md:pl-60">
        <main className="min-w-0 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
