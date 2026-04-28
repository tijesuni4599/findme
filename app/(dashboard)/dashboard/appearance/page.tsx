import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { AppearanceEditor } from "./appearance-editor";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: links }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, theme")
      .eq("id", user.id)
      .single(),
    supabase
      .from("links")
      .select("id, title")
      .eq("profile_id", user.id)
      .eq("is_enabled", true)
      .order("position", { ascending: true }),
  ]);

  const theme =
    (profile?.theme as { background?: string; foreground?: string } | null) ??
    {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Customise how your public page looks.
        </p>
      </div>

      <AppearanceEditor
        initialTheme={{
          background: theme.background ?? "#f5f5f5",
          foreground: theme.foreground ?? "#171717",
        }}
        profile={{
          username:
            profile?.username ?? user.email?.split("@")[0] ?? "you",
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }}
        links={links ?? []}
      />
    </div>
  );
}
