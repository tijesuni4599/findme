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
import { DeleteAccountDialog } from "./delete-account-dialog";
import { EmailPreferencesForm } from "./email-preferences-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const marketingEmails = user.user_metadata?.marketing_emails !== false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account details and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your display name and picture appear on your public page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            displayName={profile?.display_name ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            username={profile?.username ?? user.email?.split("@")[0] ?? "you"}
            email={user.email ?? ""}
          />
        </CardContent>
      </Card>

      {/* Email preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>
            Choose which emails you receive from us.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPreferencesForm initialMarketing={marketingEmails} />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
