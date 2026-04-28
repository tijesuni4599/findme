"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateEmailPreferences } from "./actions";

export function EmailPreferencesForm({
  initialMarketing,
}: {
  initialMarketing: boolean;
}) {
  const [marketing, setMarketing] = useState(initialMarketing);
  const [pending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const previous = marketing;
    setMarketing(checked);

    startTransition(async () => {
      const result = await updateEmailPreferences(checked);
      if (result.error) {
        setMarketing(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor="marketing-switch" className="text-sm font-medium">
          Product updates &amp; announcements
        </Label>
        <p className="text-xs text-muted-foreground">
          Occasional emails about new features and tips. Uncheck to opt out.
        </p>
      </div>
      <Switch
        id="marketing-switch"
        checked={marketing}
        onCheckedChange={handleChange}
        disabled={pending}
        aria-label="Receive marketing emails"
      />
    </div>
  );
}
