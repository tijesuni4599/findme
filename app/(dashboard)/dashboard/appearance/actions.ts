"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";

export type ThemeMutationState = { error?: string };

export async function updateTheme(
  background: string,
  foreground: string,
): Promise<ThemeMutationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("profiles")
    .update({ theme: { background, foreground } })
    .eq("id", user.id);

  if (error) return { error: "Failed to save theme. Please try again." };

  revalidatePath("/dashboard/appearance");
  revalidatePath(`/${profile.username}`);
  return {};
}
