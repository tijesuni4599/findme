"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "./actions";

const CONFIRM_PHRASE = "delete my account";

export function DeleteAccountDialog() {
  const [confirmValue, setConfirmValue] = useState("");
  const [pending, startTransition] = useTransition();

  const confirmed = confirmValue.trim().toLowerCase() === CONFIRM_PHRASE;

  function handleDelete() {
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteAccount();
      if (result?.error) {
        toast.error(result.error);
      }
      // On success, deleteAccount() calls redirect("/") server-side,
      // so the page will navigate automatically.
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete account
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your profile, all your links, and all
            analytics data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-delete">
            Type{" "}
            <span className="font-medium text-foreground">
              {CONFIRM_PHRASE}
            </span>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmValue("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!confirmed || pending}
            onClick={handleDelete}
          >
            {pending ? "Deleting…" : "Yes, delete my account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
