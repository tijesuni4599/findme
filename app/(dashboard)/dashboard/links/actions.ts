"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { linkSchema } from "@/lib/validations";
import { FREE_PLAN_LINK_LIMIT } from "@/lib/constants";

export type CreateLinkState = { error?: string };
export type LinkMutationState = { error?: string };

const editableLinkSchema = linkSchema.pick({
  title: true,
  url: true,
  thumbnail_url: true,
});

const reorderSchema = z
  .array(z.string().uuid("Invalid link id"))
  .min(1, "No links to reorder");

export async function createLink(
  _prev: CreateLinkState,
  formData: FormData,
): Promise<CreateLinkState> {
  const user = await requireUser();
  const supabase = await createClient();

  const parsed = linkSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    is_enabled: true,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  if (profileError) return { error: profileError.message };

  const { count, error: countError } = await supabase
    .from("links")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);
  if (countError) return { error: countError.message };

  if (profile.plan === "free" && (count ?? 0) >= FREE_PLAN_LINK_LIMIT) {
    return { error: "Free plan limit reached. Upgrade to add more links." };
  }

  const { data: last } = await supabase
    .from("links")
    .select("position")
    .eq("profile_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (last?.position ?? -1) + 1;

  const { error: insertError } = await supabase.from("links").insert({
    profile_id: user.id,
    title: parsed.data.title,
    url: parsed.data.url,
    position: nextPosition,
    is_enabled: parsed.data.is_enabled,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath("/dashboard/links");
  return {};
}

export async function toggleLinkEnabled(
  linkId: string,
  isEnabled: boolean,
): Promise<LinkMutationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("links")
    .update({ is_enabled: isEnabled })
    .eq("id", linkId)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/links");
  return {};
}

export async function updateLink(
  linkId: string,
  input: { title: string; url: string; thumbnail_url?: string | null },
): Promise<LinkMutationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const parsed = editableLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await supabase
    .from("links")
    .update({
      title: parsed.data.title,
      url: parsed.data.url,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
    })
    .eq("id", linkId)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/links");
  return {};
}

export async function deleteLink(linkId: string): Promise<LinkMutationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("links")
    .delete()
    .eq("id", linkId)
    .eq("profile_id", user.id);

  if (deleteError) return { error: deleteError.message };

  const { data: remainingLinks, error: remainingError } = await supabase
    .from("links")
    .select("id")
    .eq("profile_id", user.id)
    .order("position", { ascending: true });

  if (remainingError) return { error: remainingError.message };

  for (const [index, link] of (remainingLinks ?? []).entries()) {
    const { error: positionError } = await supabase
      .from("links")
      .update({ position: index })
      .eq("id", link.id)
      .eq("profile_id", user.id);
    if (positionError) return { error: positionError.message };
  }

  revalidatePath("/dashboard/links");
  return {};
}

export async function reorderLinks(
  orderedLinkIds: string[],
): Promise<LinkMutationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const parsed = reorderSchema.safeParse(orderedLinkIds);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order data" };
  }

  const nextOrder = [...new Set(parsed.data)];
  const { data: ownedLinks, error: ownedLinksError } = await supabase
    .from("links")
    .select("id")
    .eq("profile_id", user.id);

  if (ownedLinksError) return { error: ownedLinksError.message };

  const ownedIds = (ownedLinks ?? []).map((link) => link.id);
  const ownedSet = new Set(ownedIds);

  if (nextOrder.some((id) => !ownedSet.has(id))) {
    return { error: "Invalid reorder payload" };
  }

  const fullOrder = [
    ...nextOrder,
    ...ownedIds.filter((id) => !nextOrder.includes(id)),
  ];

  for (const [index, linkId] of fullOrder.entries()) {
    const { error } = await supabase
      .from("links")
      .update({ position: index })
      .eq("id", linkId)
      .eq("profile_id", user.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/links");
  return {};
}
