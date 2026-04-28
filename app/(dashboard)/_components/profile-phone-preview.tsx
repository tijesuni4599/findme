import Link from "next/link";

export type PhonePreviewTheme = {
  background: string;
  foreground: string;
};

export type PhonePreviewLink = {
  id: string;
  title: string;
};

export type PhonePreviewProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ProfilePhonePreviewProps = {
  profile: PhonePreviewProfile;
  links: PhonePreviewLink[];
  theme: PhonePreviewTheme;
};

export function ProfilePhonePreview({
  profile,
  links,
  theme,
}: ProfilePhonePreviewProps) {
  const displayName = profile.display_name?.trim() || `@${profile.username}`;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      {/* Phone frame */}
      <div className="mx-auto w-[286px] rounded-[36px] border border-border/80 bg-muted/20 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
        <div
          className="flex h-[560px] flex-col overflow-hidden rounded-[30px] transition-colors duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ backgroundColor: theme.background, color: theme.foreground }}
        >
          {/* Profile header */}
          <div className="flex flex-col items-center gap-2 px-5 pb-4 pt-8">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover"
                style={{
                  outline: "1px solid rgba(0,0,0,0.1)",
                  outlineOffset: "-1px",
                }}
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold"
                style={{ backgroundColor: `${theme.foreground}18` }}
              >
                {initial}
              </div>
            )}
            <p className="text-sm font-semibold leading-tight">{displayName}</p>
            <p className="text-xs" style={{ opacity: 0.6 }}>
              @{profile.username}
            </p>
          </div>

          <div
            className="mx-4 border-t"
            style={{ borderColor: `${theme.foreground}15` }}
          />

          {/* Links */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {links.length === 0 ? (
              <div
                className="flex h-full items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs"
                style={{
                  borderColor: `${theme.foreground}25`,
                  opacity: 0.5,
                }}
              >
                No enabled links to preview yet.
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {links.slice(0, 6).map((link) => (
                  <li key={link.id}>
                    <div
                      className="rounded-xl px-4 py-3 text-center text-sm font-medium shadow-sm"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.8)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        color: theme.foreground,
                      }}
                    >
                      {link.title}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Link to public page */}
      <p className="text-center text-xs text-muted-foreground">
        Public view for{" "}
        <Link
          href={`/${profile.username}`}
          target="_blank"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          @{profile.username}
        </Link>
      </p>
    </div>
  );
}
