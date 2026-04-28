"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfilePhonePreview } from "@/app/(dashboard)/_components/profile-phone-preview";
import { cn } from "@/lib/utils";
import { updateTheme } from "./actions";

// Colour palette — each entry ships with a foreground colour that meets
// WCAG AA contrast against the background.
export const PASTEL_THEMES = [
  { id: "white",   label: "White",   background: "#ffffff", foreground: "#171717" },
  { id: "black",   label: "Black",   background: "#0a0a0a", foreground: "#fafafa" },
  { id: "neutral", label: "Neutral", background: "#f5f5f5", foreground: "#171717" },
  { id: "rose",    label: "Rose",    background: "#ffe4e6", foreground: "#881337" },
  { id: "pink",    label: "Pink",    background: "#fce7f3", foreground: "#831843" },
  { id: "purple",  label: "Purple",  background: "#f3e8ff", foreground: "#6b21a8" },
  { id: "violet",  label: "Violet",  background: "#ede9fe", foreground: "#5b21b6" },
  { id: "blue",    label: "Blue",    background: "#dbeafe", foreground: "#1e40af" },
  { id: "sky",     label: "Sky",     background: "#e0f2fe", foreground: "#075985" },
  { id: "teal",    label: "Teal",    background: "#ccfbf1", foreground: "#115e59" },
  { id: "green",   label: "Green",   background: "#dcfce7", foreground: "#166534" },
  { id: "lime",    label: "Lime",    background: "#ecfccb", foreground: "#3f6212" },
  { id: "yellow",  label: "Yellow",  background: "#fef9c3", foreground: "#854d0e" },
  { id: "amber",   label: "Amber",   background: "#fef3c7", foreground: "#92400e" },
  { id: "orange",  label: "Orange",  background: "#ffedd5", foreground: "#9a3412" },
  { id: "peach",   label: "Peach",   background: "#fee2e2", foreground: "#991b1b" },
] as const;

type ThemeId = (typeof PASTEL_THEMES)[number]["id"];

type AppearanceEditorProps = {
  initialTheme: { background: string; foreground: string };
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  links: { id: string; title: string }[];
};

function findThemeId(background: string): ThemeId {
  return PASTEL_THEMES.find((t) => t.background === background)?.id ?? "neutral";
}

export function AppearanceEditor({
  initialTheme,
  profile,
  links,
}: AppearanceEditorProps) {
  const [selectedId, setSelectedId] = useState<ThemeId>(() =>
    findThemeId(initialTheme.background),
  );
  const [pending, startTransition] = useTransition();

  const selected = PASTEL_THEMES.find((t) => t.id === selectedId) ?? PASTEL_THEMES[0];

  function handleSelect(id: ThemeId) {
    const theme = PASTEL_THEMES.find((t) => t.id === id);
    if (!theme || id === selectedId) return;

    const previous = selectedId;
    setSelectedId(id);

    startTransition(async () => {
      const result = await updateTheme(theme.background, theme.foreground);
      if (result.error) {
        setSelectedId(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_324px]">
      {/* ── Colour picker ── */}
      <Card>
        <CardHeader>
          <CardTitle>Background colour</CardTitle>
          <CardDescription>
            Pick a pastel background for your public page. Text colour adjusts
            automatically to stay readable.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-7 gap-2.5">
            {PASTEL_THEMES.map((theme) => {
              const isSelected = selectedId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-label={theme.label}
                  aria-pressed={isSelected}
                  disabled={pending}
                  onClick={() => handleSelect(theme.id)}
                  className={cn(
                    "relative aspect-square rounded-xl transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
                    isSelected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : theme.id === "black"
                        ? "ring-1 ring-white/20 hover:ring-2 hover:ring-white/40"
                        : "ring-1 ring-black/10 hover:ring-2 hover:ring-black/20 dark:ring-white/10 dark:hover:ring-white/20",
                  )}
                  style={{ backgroundColor: theme.background }}
                >
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4" style={{ color: theme.foreground }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            Selected:{" "}
            <span className="font-medium text-foreground">{selected.label}</span>
            {pending && <span className="ml-2 text-xs opacity-60">Saving…</span>}
          </p>
        </CardContent>
      </Card>

      {/* ── Phone preview (shared component) ── */}
      <aside className="lg:sticky lg:top-[calc(3.5rem+1.5rem)]">
        <Card className="py-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium">Live preview</CardTitle>
            <CardDescription>
              How your public page looks with this colour.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pt-3">
            <ProfilePhonePreview
              profile={profile}
              links={links}
              theme={{ background: selected.background, foreground: selected.foreground }}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
