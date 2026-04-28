"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateAvatar, updateDisplayName } from "./actions";

type ProfileFormProps = {
  displayName: string | null;
  avatarUrl: string | null;
  username: string;
  email: string;
};

export function ProfileForm({
  displayName,
  avatarUrl,
  username,
  email,
}: ProfileFormProps) {
  const [avatarSrc, setAvatarSrc] = useState(avatarUrl);
  const [avatarPending, startAvatarTransition] = useTransition();
  const [namePending, startNameTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = (displayName?.trim() || username).charAt(0).toUpperCase();

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarSrc(objectUrl);

    const formData = new FormData();
    formData.append("avatar", file);

    startAvatarTransition(async () => {
      const result = await updateAvatar(formData);
      if (result.error) {
        toast.error(result.error);
        setAvatarSrc(avatarUrl); // revert
      } else {
        toast.success("Profile picture updated");
        if (result.url) setAvatarSrc(result.url);
      }
    });

    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  }

  function handleDisplayNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startNameTransition(async () => {
      const result = await updateDisplayName(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Display name updated");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={avatarPending}
          className="group relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-black/10 transition-opacity duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] dark:ring-white/10"
          aria-label="Change profile picture"
        >
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt="Profile picture"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-semibold">
              {initial}
            </div>
          )}

          {/* Hover / loading overlay */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-150",
              avatarPending ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {avatarPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>
        </button>

        <span className="text-xs text-muted-foreground">
          JPG, PNG or WebP · max 2 MB
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {/* Fields */}
      <form
        onSubmit={handleDisplayNameSubmit}
        className="flex flex-1 flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled readOnly />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} disabled readOnly />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            maxLength={60}
            defaultValue={displayName ?? ""}
            placeholder={username}
          />
        </div>

        <div>
          <Button
            type="submit"
            disabled={namePending}
            className="active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
          >
            {namePending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
