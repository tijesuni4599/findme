"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Globe2,
  GripVertical,
  PencilLine,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilePhonePreview } from "@/app/(dashboard)/_components/profile-phone-preview";
import type { PhonePreviewTheme } from "@/app/(dashboard)/_components/profile-phone-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { deleteLink, reorderLinks, toggleLinkEnabled, updateLink } from "./actions";

type LinkItem = {
  id: string;
  title: string;
  url: string;
  is_enabled: boolean;
  position: number;
  click_count: number;
  thumbnail_url: string | null;
};

type ProfileSummary = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro";
};

type LinksWorkspaceProps = {
  initialLinks: LinkItem[];
  profile: ProfileSummary;
  theme: PhonePreviewTheme;
};

function sortLinks(links: LinkItem[]) {
  return [...links].sort((a, b) => a.position - b.position);
}

function normalizePositions(links: LinkItem[]) {
  return links.map((link, index) => ({ ...link, position: index }));
}

function moveLinkToIndex(links: LinkItem[], draggedId: string, targetIndex: number) {
  const fromIndex = links.findIndex((link) => link.id === draggedId);
  if (fromIndex < 0) return links;

  const boundedTarget = Math.max(0, Math.min(targetIndex, links.length));
  if (boundedTarget === fromIndex || boundedTarget === fromIndex + 1) return links;

  const nextLinks = [...links];
  const [dragged] = nextLinks.splice(fromIndex, 1);
  const insertionIndex = fromIndex < boundedTarget ? boundedTarget - 1 : boundedTarget;
  nextLinks.splice(insertionIndex, 0, dragged);
  return normalizePositions(nextLinks);
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function displayHost(url: string, max = 20) {
  const host = getHostname(url);
  return host.length > max ? host.slice(0, max) + "…" : host;
}

function getThumbnailSrc(link: LinkItem) {
  if (link.thumbnail_url) return link.thumbnail_url;
  try {
    const hostname = new URL(link.url).hostname;
    return hostname
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
      : null;
  } catch {
    return null;
  }
}

function LinkThumbnail({
  link,
  className,
}: {
  link: LinkItem;
  className?: string;
}) {
  const src = getThumbnailSrc(link);

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-black/10 dark:ring-white/10",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <Globe2 className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

export function LinksWorkspace({ initialLinks, profile, theme }: LinksWorkspaceProps) {
  const [links, setLinks] = useState(() => sortLinks(initialLinks));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [reorderPending, startReorderTransition] = useTransition();
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editThumbnail, setEditThumbnail] = useState("");
  const [editPending, startEditTransition] = useTransition();

  const enabledLinks = useMemo(
    () => links.filter((link) => link.is_enabled),
    [links],
  );

  function openEdit(link: LinkItem) {
    setEditingLinkId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.url);
    setEditThumbnail(link.thumbnail_url ?? "");
  }

  function closeEditDialog() {
    setEditingLinkId(null);
    setEditTitle("");
    setEditUrl("");
    setEditThumbnail("");
  }

  async function handleToggle(linkId: string, nextEnabled: boolean) {
    const previous = links;
    setLinks((current) =>
      current.map((link) =>
        link.id === linkId ? { ...link, is_enabled: nextEnabled } : link,
      ),
    );

    const result = await toggleLinkEnabled(linkId, nextEnabled);
    if (result.error) {
      setLinks(previous);
      toast.error(result.error);
    }
  }

  async function handleDelete(link: LinkItem) {
    if (!window.confirm(`Delete "${link.title}"?`)) return;

    const previous = links;
    setLinks(normalizePositions(links.filter((item) => item.id !== link.id)));

    const result = await deleteLink(link.id);
    if (result.error) {
      setLinks(previous);
      toast.error(result.error);
      return;
    }

    toast.success("Link deleted");
  }

  async function handleDrop(targetIndex: number) {
    if (!draggingId) return;

    const previous = links;
    const next = moveLinkToIndex(previous, draggingId, targetIndex);
    setDraggingId(null);

    if (next === previous) return;
    setLinks(next);

    const nextOrder = next.map((link) => link.id);
    startReorderTransition(async () => {
      const result = await reorderLinks(nextOrder);
      if (result.error) {
        setLinks(previous);
        toast.error(result.error);
      }
    });
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLinkId) return;

    const linkId = editingLinkId;
    const payload = {
      title: editTitle.trim(),
      url: editUrl.trim(),
      thumbnail_url: editThumbnail.trim() || null,
    };

    const previous = links;
    setLinks(
      links.map((link) =>
        link.id === linkId
          ? {
              ...link,
              title: payload.title,
              url: payload.url,
              thumbnail_url: payload.thumbnail_url,
            }
          : link,
      ),
    );

    startEditTransition(async () => {
      const result = await updateLink(linkId, payload);
      if (result.error) {
        setLinks(previous);
        toast.error(result.error);
        return;
      }

      closeEditDialog();
      toast.success("Link updated");
    });
  }

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_324px]">
        <section className="flex flex-col gap-2.5">
          {links.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <p className="font-medium">No links yet</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Add your first link so your audience has somewhere to land.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {links.map((link, index) => (
                <Card
                  key={link.id}
                  className={cn(
                    "overflow-hidden py-0 transition-shadow duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
                    draggingId === link.id && "ring-2 ring-primary/30",
                    !link.is_enabled && "opacity-75",
                  )}
                  onDragOver={(event) => {
                    if (!draggingId || draggingId === link.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDrop(index);
                  }}
                >
                  <CardContent className="flex items-center gap-3 px-3 py-2.5 sm:px-3.5">
                    <button
                      type="button"
                      draggable
                      aria-label={`Drag to reorder ${link.title}`}
                      className="hidden h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-muted hover:text-foreground active:scale-[0.96] active:cursor-grabbing sm:flex"
                      onDragStart={(event) => {
                        setDraggingId(link.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", link.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <LinkThumbnail link={link} className="h-9 w-9 rounded-md" />

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate font-medium leading-tight">{link.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {displayHost(link.url)}
                      </p>
                    </div>

                    <span className="hidden whitespace-nowrap text-xs text-muted-foreground tabular-nums sm:block">
                      {link.click_count.toLocaleString()} clicks
                    </span>

                    <div className="flex shrink-0 items-center gap-1">
                      <Switch
                        checked={link.is_enabled}
                        onCheckedChange={(checked) => {
                          void handleToggle(link.id, Boolean(checked));
                        }}
                        aria-label={
                          link.is_enabled
                            ? `Disable ${link.title}`
                            : `Enable ${link.title}`
                        }
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${link.title}`}
                        className="rounded-lg active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
                        onClick={() => openEdit(link)}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${link.title}`}
                        className="rounded-lg text-destructive active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
                        onClick={() => void handleDelete(link)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {draggingId ? (
                <div
                  className="rounded-xl border border-dashed border-border/80 px-4 py-3 text-center text-xs text-muted-foreground"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDrop(links.length);
                  }}
                >
                  Drop here to move to the end
                </div>
              ) : null}
            </>
          )}

          {(reorderPending || editPending) && (
            <p className="text-xs text-muted-foreground">
              {reorderPending ? "Saving link order…" : "Saving changes…"}
            </p>
          )}
        </section>

        <aside className="lg:sticky lg:top-[calc(3.5rem+1.5rem)]">
          <Card className="py-3">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium">Live phone preview</CardTitle>
              <CardDescription>
                Updates instantly as you edit, reorder, or disable links.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-3 pt-3">
              <ProfilePhonePreview
                profile={profile}
                links={enabledLinks.map((l) => ({ id: l.id, title: l.title }))}
                theme={theme}
              />
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Go to my public profile
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={editingLinkId !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit link</DialogTitle>
            <DialogDescription>
              Update the title, URL, or thumbnail shown in your list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-link-title">Title</Label>
              <Input
                id="edit-link-title"
                required
                maxLength={80}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-link-url">URL</Label>
              <Input
                id="edit-link-url"
                type="url"
                required
                value={editUrl}
                onChange={(event) => setEditUrl(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-link-thumbnail">Thumbnail URL (optional)</Label>
              <Input
                id="edit-link-thumbnail"
                type="url"
                placeholder="https://example.com/thumbnail.png"
                value={editThumbnail}
                onChange={(event) => setEditThumbnail(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={editPending}
                className="active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
              >
                {editPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
