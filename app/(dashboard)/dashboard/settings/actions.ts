"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(60, "Display name must be 60 characters or fewer");

export type SettingsMutationState = { error?: string };

// ── Display name ──────────────────────────────────────────────────────────────

export async function updateDisplayName(
  formData: FormData,
): Promise<SettingsMutationState> {
  const user = await requireUser();
  const supabase = await createClient();

  const parsed = displayNameSchema.safeParse(formData.get("display_name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid display name" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (error) return { error: "Failed to update display name." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  if (profile?.username) revalidatePath(`/${profile.username}`);

  return {};
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export async function updateAvatar(
  formData: FormData,
): Promise<SettingsMutationState & { url?: string }> {
  const user = await requireUser();

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "File must be an image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Image must be under 2 MB." };

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${user.id}/avatar.${ext}`;
  const buffer = await file.arrayBuffer();

  const serviceClient = createServiceRoleClient();

  const { error: uploadError } = await serviceClient.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return {
      error:
        uploadError.message.includes("Bucket not found")
          ? 'Storage not ready. Create a public "avatars" bucket in your Supabase project.'
          : "Upload failed. Please try again.",
    };
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from("avatars").getPublicUrl(path);

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { error: "Upload succeeded but failed to save the URL." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  if (profile?.username) revalidatePath(`/${profile.username}`);

  return { url: publicUrl };
}

// ── Email preferences ─────────────────────────────────────────────────────────

export async function updateEmailPreferences(
  marketing: boolean,
): Promise<SettingsMutationState> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    data: { marketing_emails: marketing },
  });

  if (error) return { error: "Failed to update email preferences." };
  return {};
}

// ── Delete account ────────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<SettingsMutationState> {
  const user = await requireUser();
  const serviceClient = createServiceRoleClient();

  // Delete user data explicitly before removing the auth record.
  await serviceClient.from("links").delete().eq("profile_id", user.id);
  await serviceClient.from("profiles").delete().eq("id", user.id);

  const { error } = await serviceClient.auth.admin.deleteUser(user.id);
  if (error) return { error: "Failed to delete account. Please contact support." };

  // Clear session cookies now that the auth record is gone.
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}
