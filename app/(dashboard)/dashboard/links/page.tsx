import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { FREE_PLAN_LINK_LIMIT } from "@/lib/constants";
import { AddLinkDialog } from "./add-link-dialog";
import { LinksWorkspace } from "./links-workspace";

export const metadata: Metadata = { title: "Links" };

export default async function LinksPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, plan, theme")
    .eq("id", user.id)
    .single();

  const { data: links } = await supabase
    .from("links")
    .select("id, title, url, is_enabled, position, click_count, thumbnail_url")
    .eq("profile_id", user.id)
    .order("position", { ascending: true });

  const linkCount = links?.length ?? 0;
  const isFree = profile?.plan === "free";
  const atLimit = isFree && linkCount >= FREE_PLAN_LINK_LIMIT;

  const rawTheme = profile?.theme as
    | { background?: string; foreground?: string }
    | null
    | undefined;
  const theme = {
    background: rawTheme?.background ?? "#f5f5f5",
    foreground: rawTheme?.foreground ?? "#171717",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your links</h1>
          <p className="text-sm text-muted-foreground">
            {isFree
              ? `${linkCount} / ${FREE_PLAN_LINK_LIMIT} links on the free plan`
              : `${linkCount} links`}
          </p>
        </div>
        <AddLinkDialog disabled={atLimit} />
      </div>
      <LinksWorkspace
        initialLinks={links ?? []}
        profile={{
          username: profile?.username ?? user.email?.split("@")[0] ?? "you",
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          plan: profile?.plan ?? "free",
        }}
        theme={theme}
      />
    </div>
  );
}
