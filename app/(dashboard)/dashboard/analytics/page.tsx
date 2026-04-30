import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PeriodTabs, type Period } from "./period-tabs";

export const metadata: Metadata = { title: "Analytics" };

function parsePeriod(raw: string | undefined): Period {
  if (raw === "today" || raw === "7d" || raw === "30d") return raw;
  return "7d";
}

function getStartDate(period: Period): Date {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = period === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function periodLabel(period: Period) {
  if (period === "today") return "today";
  if (period === "7d") return "last 7 days";
  return "last 30 days";
}

function fmt(n: number) {
  return n.toLocaleString("en-NG");
}

type Props = { searchParams: Promise<{ period?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const user = await requireUser();
  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const startDate = getStartDate(period);

  const supabase = await createClient();

  // Fetch events + links in parallel
  const [{ data: rawEvents }, { data: links }] = await Promise.all([
    supabase
      .from("link_click_events")
      .select("event_type, device, referrer_platform, link_id")
      .eq("profile_id", user.id)
      .gte("created_at", startDate.toISOString())
      .limit(10000),
    supabase
      .from("links")
      .select("id, title")
      .eq("profile_id", user.id)
      .order("position", { ascending: true }),
  ]);

  const events = rawEvents ?? [];

  // ── Aggregates ─────────────────────────────────────────────────────────────

  const pageViews = events.filter((e) => e.event_type === "page_view").length;
  const linkClicks = events.filter((e) => e.event_type === "link_click").length;

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  for (const e of events) {
    if (e.device && e.device !== "unknown") {
      deviceMap[e.device] = (deviceMap[e.device] ?? 0) + 1;
    }
  }
  const totalDevices = Object.values(deviceMap).reduce((a, b) => a + b, 0);
  const mobileShare =
    totalDevices > 0
      ? Math.round(((deviceMap.mobile ?? 0) / totalDevices) * 100)
      : null;

  // Referrer breakdown
  const referrerMap: Record<string, number> = {};
  for (const e of events) {
    if (e.referrer_platform) {
      referrerMap[e.referrer_platform] =
        (referrerMap[e.referrer_platform] ?? 0) + 1;
    }
  }
  const referrersSorted = Object.entries(referrerMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const topReferrer = referrersSorted[0]?.[0] ?? null;
  const maxReferrer = Math.max(...referrersSorted.map(([, c]) => c), 1);

  // Per-link clicks in period
  const linkClicksInPeriod: Record<string, number> = {};
  for (const e of events) {
    if (e.event_type === "link_click" && e.link_id) {
      linkClicksInPeriod[e.link_id] = (linkClicksInPeriod[e.link_id] ?? 0) + 1;
    }
  }

  const linksWithClicks = (links ?? [])
    .map((l) => ({ ...l, clicks: linkClicksInPeriod[l.id] ?? 0 }))
    .sort((a, b) => b.clicks - a.clicks);
  const maxLinkClicks = Math.max(...linksWithClicks.map((l) => l.clicks), 1);

  // Device sorted
  const devicesSorted = Object.entries(deviceMap).sort(([, a], [, b]) => b - a);
  const maxDevice = Math.max(...devicesSorted.map(([, c]) => c), 1);

  const label = periodLabel(period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          How your page is performing across platforms and devices.
        </p>
      </div>

      <PeriodTabs current={period} />

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Page views</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {fmt(pageViews)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground capitalize">{label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Link clicks</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {fmt(linkClicks)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground capitalize">{label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Click-through rate</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {pageViews > 0
                ? `${Math.round((linkClicks / pageViews) * 100)}%`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground capitalize">{label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Mobile share</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {mobileShare !== null ? `${mobileShare}%` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground capitalize">{label}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-link + Traffic sources */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Per-link breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Link clicks</CardTitle>
            <CardDescription>
              Clicks per link — {label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linksWithClicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {linksWithClicks.map((link) => (
                  <div key={link.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {link.title}
                      </p>
                      <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                        {fmt(link.clicks)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/60 transition-all duration-500"
                        style={{
                          width: `${(link.clicks / maxLinkClicks) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic sources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Traffic sources</CardTitle>
            <CardDescription>
              Where your visitors come from — {label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referrersSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No traffic data yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {referrersSorted.map(([platform, count]) => (
                  <div key={platform} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium capitalize">
                        {platform === "direct" ? "Direct / typed" : platform}
                      </p>
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {fmt(count)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/60 transition-all duration-500"
                        style={{ width: `${(count / maxReferrer) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Devices</CardTitle>
          <CardDescription>
            Visitor device breakdown — {label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devicesSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No device data yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {devicesSorted.map(([device, count]) => (
                <div key={device} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium capitalize">{device}</p>
                    <span className="tabular-nums text-sm text-muted-foreground">
                      {fmt(count)}
                      {totalDevices > 0 && (
                        <span className="ml-1.5 text-xs opacity-60">
                          {Math.round((count / totalDevices) * 100)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/60 transition-all duration-500"
                      style={{ width: `${(count / maxDevice) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top referrer callout — only show when there's a clear winner */}
      {topReferrer && topReferrer !== "direct" && (
        <p className="text-center text-xs text-muted-foreground">
          Most of your traffic{" "}
          {label === "today" ? "today" : `in the ${label}`} came from{" "}
          <span className="font-medium capitalize text-foreground">
            {topReferrer}
          </span>
          .
        </p>
      )}
    </div>
  );
}
